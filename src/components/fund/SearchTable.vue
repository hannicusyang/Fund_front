<!-- src/components/fund/SearchTable.vue -->
<template>
  <div>
    <!-- 搜索表单 -->
    <a-form :model="searchForm" layout="inline" @finish="handleSearch" class="search-form">
      <a-form-item label="基金名称">
        <a-input v-model:value="searchForm.fund_name" placeholder="请输入基金名称" allowClear  />
      </a-form-item>
      <a-form-item label="基金代码">
        <a-input v-model:value="searchForm.fund_code" placeholder="请输入基金代码" allowClear />
      </a-form-item>
      <a-form-item>
        <a-button type="primary" html-type="submit">搜索</a-button>
        <a-button style="margin-left: 8px" @click="resetSearch">重置</a-button>
      </a-form-item>
    </a-form>

    <!-- 基金列表表格（桌面端） -->
    <a-table
      v-if="!isMobile"
      :data-source="fundList"
      :columns="columns"
      :loading="loading"
      :row-key="record => record.fund_code"
      :pagination="paginationConfig"
      style="margin-top: 16px"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <!-- 自选列：根据 is_checked 显示 + 或 ✔ -->
        <template v-if="column.key === 'favorite'">
          <a-button
            type="primary"
            size="small"
            @click="toggleFavorite(record)"
          >
            <template v-if="record.is_checked">
              <CheckOutlined />
            </template>
            <template v-else>
              <PlusOutlined />
            </template>
          </a-button>
        </template>

        <!-- 操作列 -->
        <template v-if="column.key === 'action'">
          <a-button size="small" type="link" @click="goToDetail(record.fund_code)">
            查看详情
          </a-button>
        </template>

        <!-- 百分比字段 -->
        <template
          v-else-if="
            column.key?.endsWith('_rate') ||
            column.key === 'ytd_growth_rate' ||
            column.key === 'since_inception_growth_rate'
          "
        >
          <span :style="{ color: getGrowthColor(record[column.dataIndex]) }">
            {{ formatPercent(record[column.dataIndex]) }}
          </span>
        </template>
      </template>
    </a-table>

    <!-- 移动端卡片列表 -->
    <div v-if="isMobile" class="mobile-card-list">
      <a-spin :spinning="loading">
        <div 
          v-for="item in fundList" 
          :key="item.fund_code" 
          class="fund-card"
          @click="goToDetail(item.fund_code)"
        >
          <div class="card-header">
            <div class="fund-name">{{ item.fund_name || item.fund_code }}</div>
            <div class="fund-code">{{ item.fund_code }}</div>
          </div>
          <div class="card-body">
            <div class="card-row">
              <div class="card-item">
                <span class="label">最新净值</span>
                <span class="value">{{ item.net_value || '-' }}</span>
              </div>
              <div class="card-item">
                <span class="label">日增长率</span>
                <span class="value" :style="{ color: getGrowthColor(item.daily_growth_rate) }">{{ formatPercent(item.daily_growth_rate) }}</span>
              </div>
              <div class="card-item">
                <span class="label">排名</span>
                <span class="value">{{ item.rank || '-' }}</span>
              </div>
            </div>
            <div class="card-row">
              <div class="card-item">
                <span class="label">近1周</span>
                <span class="value" :style="{ color: getGrowthColor(item.weekly_growth_rate) }">{{ formatPercent(item.weekly_growth_rate) }}</span>
              </div>
              <div class="card-item">
                <span class="label">近1月</span>
                <span class="value" :style="{ color: getGrowthColor(item.monthly_1_growth_rate) }">{{ formatPercent(item.monthly_1_growth_rate) }}</span>
              </div>
              <div class="card-item">
                <span class="label">近3月</span>
                <span class="value" :style="{ color: getGrowthColor(item.monthly_3_growth_rate) }">{{ formatPercent(item.monthly_3_growth_rate) }}</span>
              </div>
            </div>
            <div class="card-row">
              <div class="card-item">
                <span class="label">近6月</span>
                <span class="value" :style="{ color: getGrowthColor(item.monthly_6_growth_rate) }">{{ formatPercent(item.monthly_6_growth_rate) }}</span>
              </div>
              <div class="card-item">
                <span class="label">近1年</span>
                <span class="value" :style="{ color: getGrowthColor(item.yearly_1_growth_rate) }">{{ formatPercent(item.yearly_1_growth_rate) }}</span>
              </div>
              <div class="card-item">
                <span class="label">今年来</span>
                <span class="value" :style="{ color: getGrowthColor(item.ytd_growth_rate) }">{{ formatPercent(item.ytd_growth_rate) }}</span>
              </div>
            </div>
          </div>
        </div>
        <a-empty v-if="fundList.length === 0 && !loading" description="暂无数据" />
      </a-spin>
      
      <!-- 移动端分页 -->
      <div v-if="isMobile && pagination.total > 0" class="mobile-pagination">
        <a-pagination
          v-model:current="pagination.current"
          :total="pagination.total"
          :pageSize="pagination.pageSize"
          :showSizeChanger="true"
          :showQuickJumper="true"
          :pageSizeOptions="['10', '20', '50', '100']"
          @change="handlePageChange"
          show-total
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed, onUnmounted } from 'vue'
import { message } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import { fundApi } from '@/api/fund'
import { PlusOutlined,CheckOutlined } from '@ant-design/icons-vue'

// 移动端检测
const isMobile = ref(false)
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

const currentSortField = ref('')
const currentSortOrder = ref('asc')
const router = useRouter()

// ✅ 新增：标记组件是否已卸载
let isUnmounted = false
onUnmounted(() => {
  isUnmounted = true
})

const searchForm = ref({
  fund_name: '',
  fund_code: ''
})
const fundList = ref([])
const loading = ref(false)

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0
})

const paginationConfig = computed(() => ({
  current: pagination.current,
  pageSize: pagination.pageSize,
  total: pagination.total,
  showSizeChanger: true,
  showQuickJumper: true,
  pageSizeOptions: ['10', '20', '50', '100']
}))

const columns = [
  { title: '自选', key: 'favorite', width: 80, align: 'center' },
  { title: '基金代码', dataIndex: 'fund_code', key: 'fund_code', align: 'center' },
  { title: '基金名称', dataIndex: 'fund_name', key: 'fund_name', align: 'center' },
  { title: '日期', dataIndex: 'date', key: 'date', align: 'center' },
  { title: '最新净值', dataIndex: 'net_value', key: 'net_value', align: 'center' },
  { title: '日增长率', dataIndex: 'daily_growth_rate', key: 'daily_growth_rate', align: 'center',sorter: true  },
  { title: '排名', dataIndex: 'rank', key: 'rank', align: 'center',sorter: true  },
  { title: '交易费率', dataIndex: 'fee_rate', key: 'fee_rate', align: 'center' },
  { title: '近一周', dataIndex: 'weekly_growth_rate', key: 'weekly_growth_rate', align: 'center',sorter: true  },
  { title: '近一月', dataIndex: 'monthly_1_growth_rate', key: 'monthly_1_growth_rate', align: 'center',sorter: true  },
  { title: '近三月', dataIndex: 'monthly_3_growth_rate', key: 'monthly_3_growth_rate', align: 'center',sorter: true  },
  { title: '近六月', dataIndex: 'monthly_6_growth_rate', key: 'monthly_6_growth_rate', align: 'center',sorter: true  },
  { title: '近一年', dataIndex: 'yearly_1_growth_rate', key: 'yearly_1_growth_rate', align: 'center',sorter: true  },
  { title: '近两年', dataIndex: 'yearly_2_growth_rate', key: 'yearly_2_growth_rate', align: 'center',sorter: true  },
  { title: '近三年', dataIndex: 'yearly_3_growth_rate', key: 'yearly_3_growth_rate', align: 'center',sorter: true  },
  { title: '操作', key: 'action', fixed: 'right', width: 150, align: 'center' }
]

const loadData = async () => {
  loading.value = true
  try {
    const params = {
      ...searchForm.value,
      page: pagination.current,
      page_size: pagination.pageSize,
      // 添加排序参数
      sort_field: currentSortField.value,
      sort_order: currentSortOrder.value
    }
    const res = await fundApi.searchFunds(params)
    if (isUnmounted) return
    pagination.total = res.data.total
    fundList.value = (res.data.funds || []).map(fund => ({
      ...fund,
    }))
  } catch (error) {
    if (!isUnmounted) {
      message.error('加载失败')
    }
    console.error(error)
  } finally {
    if (!isUnmounted) {
      loading.value = false
    }
  }
}

const handlePageChange = (page) => {
  pagination.current = page
  loadData()
}

const handleSearch = () => {
  pagination.current = 1
  loadData()
}

const resetSearch = () => {
  searchForm.value = { fund_name: '', fund_code: '' }
  pagination.current = 1
  loadData()
}

const goToDetail = (fundCode) => {
  router.push(`/FundDetail/${fundCode}`)
}

const toggleFavorite = async (record) => {
  // ✅ 确保只取 fund_code 字符串
  const fundCode = record.fund_code;

  try {
    if (record.is_checked) {
      await fundApi.removeFromStore(fundCode); // 传字符串
      message.success('已取消自选');
    } else {
      await fundApi.addToStore(fundCode); // 传字符串
      message.success('已加入自选');
    }
    if (!isUnmounted) {
      record.is_checked = !record.is_checked;
    }
  } catch (error) {
    if (!isUnmounted) {
      message.error(record.is_checked ? '取消失败' : '加入失败');
    }
  }
};

const formatPercent = (value) => {
  if (value == null || value === '') return '--'
  return `${value.toFixed(2)}%`
}

const getGrowthColor = (value) => {
  if (value == null) return 'inherit'
  return value >= 0 ? '#f5222d' : '#52c41a'
}

const handleTableChange = (newPagination, filters, sorter) => {
  pagination.current = newPagination.current
  pagination.pageSize = newPagination.pageSize

  // 处理排序
  if (sorter && sorter.column) {
    const sortField = sorter.column.key // 使用 column.key 对应后端字段名
    const sortOrder = sorter.order === 'descend' ? 'desc' : 'asc'
    currentSortField.value = sortField
    currentSortOrder.value = sortOrder
  } else {
    // 清除排序
    currentSortField.value = ''
    currentSortOrder.value = 'asc'
  }

  loadData() // 重新加载数据（带排序参数）
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  loadData()
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>
<style scoped>
/* 移动端卡片列表 */
.mobile-card-list {
  padding: 8px;
}
.fund-card {
  background: #fff;
  border-radius: 12px;
  margin-bottom: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  cursor: pointer;
}
.fund-card:active {
  opacity: 0.9;
}
.fund-card .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}
.fund-card .fund-name {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}
.fund-card .fund-code {
  font-size: 12px;
  color: #666;
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 4px;
}
.fund-card .card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.fund-card .card-row {
  display: flex;
  justify-content: space-between;
  background: #fafafa;
  padding: 8px 12px;
  border-radius: 8px;
}
.fund-card .card-item {
  flex: 1;
  text-align: center;
}
.fund-card .card-item .label {
  display: block;
  font-size: 11px;
  color: #888;
  margin-bottom: 2px;
}
.fund-card .card-item .value {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #333;
}

/* 搜索表单间距 */
.search-form {
  margin-bottom: 16px;
}
.search-form :deep(.ant-form-item) {
  margin-bottom: 12px;
}

/* 移动端分页 */
.mobile-pagination {
  display: flex;
  justify-content: center;
  padding: 12px 8px;
  background: #fff;
  border-radius: 8px;
  margin-top: 12px;
  overflow-x: auto;
}
.mobile-pagination :deep(.ant-pagination) {
  flex-wrap: nowrap;
  font-size: 12px;
}
.mobile-pagination :deep(.ant-pagination-item) {
  min-width: 28px;
  height: 28px;
  line-height: 26px;
}
.mobile-pagination :deep(.ant-pagination-options) {
  margin-left: 4px;
}
.mobile-pagination :deep(.ant-pagination-options-quick-jumper) {
  font-size: 12px;
}
.mobile-pagination :deep(.ant-select) {
  font-size: 12px;
}
</style>
