<template>
  <div class="fund-portfolio">
    <!-- 顶部：我的组合列表 -->
    <a-card title="📁 我的组合" class="portfolio-list-card" style="margin-bottom: 16px;">
      <template #extra>
        <a-space v-if="!isMobile">
          <a-button @click="showCreateModal = true">
            <PlusOutlined /> 新建组合
          </a-button>
          <a-button @click="loadPortfolioList" :loading="loadingPortfolios">
            <ReloadOutlined /> 刷新
          </a-button>
        </a-space>
        <template v-else>
          <a-dropdown>
            <a-button size="small"><MoreOutlined /> 操作</a-button>
            <template #overlay>
              <a-menu>
                <a-menu-item @click="showCreateModal = true">
                  <PlusOutlined /> 新建组合
                </a-menu-item>
                <a-menu-item @click="loadPortfolioList">
                  <ReloadOutlined /> 刷新列表
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </template>
      </template>

      <a-empty v-if="savedPortfolios.length === 0 && !loadingPortfolios" description="暂无保存的组合" />
      
      <a-spin :spinning="loadingPortfolios">
        <a-row :gutter="16">
          <a-col 
            v-for="portfolio in savedPortfolios" 
            :key="portfolio.id" 
            :xs="24" 
            :sm="12" 
            :md="8" 
            :lg="6"
            style="margin-bottom: 16px;"
          >
            <a-card 
              class="portfolio-item-card" 
              :class="{ 'is-default': portfolio.is_default }"
              hoverable
              @click="loadPortfolio(portfolio)"
            >
              <template #title>
                <a-space>
                  <span>{{ portfolio.name }}</span>
                  <a-tag v-if="portfolio.is_default" color="green">默认</a-tag>
                </a-space>
              </template>
              <template #extra>
                <a-dropdown>
                  <a-button type="text" size="small" @click.stop>
                    <MoreOutlined />
                  </a-button>
                  <template #overlay>
                    <a-menu>
                      <a-menu-item @click="loadPortfolio(portfolio)"><EyeOutlined /> 查看</a-menu-item>
                      <a-menu-item @click="setDefaultPortfolio(portfolio.id)" :disabled="portfolio.is_default">
                        <StarOutlined /> 设为默认
                      </a-menu-item>
                      <a-menu-divider />
                      <a-menu-item danger @click="deletePortfolio(portfolio.id)"><DeleteOutlined /> 删除</a-menu-item>
                    </a-menu>
                  </template>
                </a-dropdown>
              </template>
              
              <a-descriptions :column="1" size="small">
                <a-descriptions-item label="策略">{{ strategyLabel(portfolio.strategy) }}</a-descriptions-item>
                <a-descriptions-item label="基金数">{{ portfolio.fund_count }} 只</a-descriptions-item>
                <a-descriptions-item label="预期收益">
                  <span :class="getRateClass(portfolio.expected_return)">
                    {{ formatRate(portfolio.expected_return) }}
                  </span>
                </a-descriptions-item>
                <a-descriptions-item label="夏普比率">
                  <a-tag :color="sharpeColor(portfolio.sharpe_ratio)">
                    {{ portfolio.sharpe_ratio?.toFixed(2) || '--' }}
                  </a-tag>
                </a-descriptions-item>
              </a-descriptions>
              
              <div class="portfolio-date">
                创建于: {{ formatDate(portfolio.created_at) }}
              </div>
            </a-card>
          </a-col>
        </a-row>
      </a-spin>
    </a-card>

    <a-row :gutter="16">
      <!-- 左侧：组合配置面板 -->
      <a-col :xs="24" :lg="8">
        <a-card title="⚙️ 组合配置" class="config-card">
          <a-form :model="portfolioConfig" layout="vertical">
            <a-form-item label="组合名称">
              <a-input 
                v-model:value="portfolioConfig.name" 
                placeholder="输入组合名称"
              >
                <template #prefix>
                  <EditOutlined />
                </template>
              </a-input>
            </a-form-item>

            <a-form-item label="投资目标">
              <a-radio-group v-model:value="portfolioConfig.goal" @change="onGoalChange">
                <a-radio-button value="conservative">🛡️ 保守型</a-radio-button>
                <a-radio-button value="balanced">⚖️ 平衡型</a-radio-button>
                <a-radio-button value="aggressive">🚀 进取型</a-radio-button>
              </a-radio-group>
            </a-form-item>

            <!-- 投资目标约束提示 -->
            <a-alert
              :message="goalConstraint.title"
              :description="goalConstraint.description"
              :type="goalConstraint.type"
              show-icon
              style="margin-bottom: 16px"
            />

            <a-form-item label="配置策略">
              <a-select v-model:value="portfolioConfig.strategy" @change="onStrategyChange">
                <a-select-option value="equal">等权重配置</a-select-option>
                <a-select-option value="risk_parity">风险平价配置</a-select-option>
                <a-select-option value="max_sharpe">最大夏普比率</a-select-option>
                <a-select-option value="min_variance">最小方差优化</a-select-option>
                <a-select-option value="custom">自定义权重</a-select-option>
              </a-select>
            </a-form-item>

            <a-form-item label="投资金额">
              <a-input-number
                v-model:value="portfolioConfig.amount"
                :min="10000"
                :step="10000"
                style="width: 100%"
                :formatter="value => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
                :parser="value => value.replace(/\¥\s?|(,*)/g, '')"
              />
            </a-form-item>
          </a-form>

          <a-divider>🎯 备选基金池 ({{ fundPool.length }})</a-divider>

          <div class="pool-section">
            <a-list
              :data-source="fundPool"
              size="small"
              :pagination="{ pageSize: 5, size: 'small' }"
            >
              <template #renderItem="{ item }">
                <a-list-item>
                  <a-list-item-meta
                    :title="item.fund_name"
                    :description="`${item.fund_code} | ${item.fund_type || '混合型'} | 年费:${item.fee_rate || '--'}%`"
                  >
                    <template #avatar>
                      <a-avatar :style="{ backgroundColor: getFundTypeColor(item.fund_type) }">
                        {{ item.fund_name?.charAt(0) }}
                      </a-avatar>
                    </template>
                  </a-list-item-meta>
                  <template #actions>
                    <a-button 
                      type="primary" 
                      size="small"
                      @click="addToPortfolio(item)"
                      :disabled="isInPortfolio(item)"
                    >
                      {{ isInPortfolio(item) ? '已添加' : '添加' }}
                    </a-button>
                  </template>
                </a-list-item>
              </template>
            </a-list>
          </div>

          <a-divider>💼 我的持仓</a-divider>
          <a-space wrap style="margin-bottom: 12px;">
            <a-button size="small" @click="loadMyHoldings" :loading="loadingHoldings">
              <ReloadOutlined /> 刷新持仓
            </a-button>
            <a-button type="primary" size="small" @click="addHoldingsToPortfolio" :disabled="myHoldings.length === 0">
              一键添加持仓到组合
            </a-button>
          </a-space>

          <div class="holdings-section" v-if="myHoldings.length > 0">
            <a-list
              :data-source="myHoldings"
              size="small"
              :pagination="{ pageSize: 3, size: 'small' }"
            >
              <template #renderItem="{ item }">
                <a-list-item>
                  <a-list-item-meta
                    :title="item.fund_name"
                    :description="`${item.fund_code} | 持仓:${formatNumber(item.shares)}份 | 收益:${formatRate(item.profit_rate)}`"
                  >
                    <template #avatar>
                      <a-avatar :style="{ backgroundColor: item.profit >= 0 ? '#52c41a' : '#f5222d' }">
                        {{ item.fund_name?.charAt(0) }}
                      </a-avatar>
                    </template>
                  </a-list-item-meta>
                  <template #actions>
                    <a-button 
                      type="link" 
                      size="small"
                      @click="addToPortfolio(item)"
                      :disabled="isInPortfolio(item)"
                    >
                      {{ isInPortfolio(item) ? '已加' : '添加' }}
                    </a-button>
                  </template>
                </a-list-item>
              </template>
            </a-list>
          </div>
          <a-empty v-else description="暂无持仓数据" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
        </a-card>
      </a-col>

      <!-- 右侧：组合构建结果 -->
      <a-col :xs="24" :lg="16">
        <a-card 
          :title="`📊 ${portfolioConfig.name || '当前组合'} (${portfolioFunds.length}只基金)`" 
          class="portfolio-card"
        >
          <template #extra>
            <a-space v-if="!isMobile">
              <a-button @click="clearPortfolio" :disabled="portfolioFunds.length === 0">
                <ClearOutlined /> 清空
              </a-button>
              <a-button @click="autoOptimize" :loading="optimizing" :disabled="portfolioFunds.length < 2">
                <ThunderboltOutlined /> 自动优化
              </a-button>
              <a-button 
                type="primary" 
                @click="savePortfolio" 
                :loading="saving"
                :disabled="portfolioFunds.length === 0 || totalWeight !== 100"
              >
                <SaveOutlined /> {{ currentPortfolioId ? '更新组合' : '保存组合' }}
              </a-button>
            </a-space>
            <template v-else>
              <a-dropdown>
                <a-button size="small"><MoreOutlined /> 操作</a-button>
                <template #overlay>
                  <a-menu>
                    <a-menu-item @click="clearPortfolio" :disabled="portfolioFunds.length === 0">
                      <ClearOutlined /> 清空
                    </a-menu-item>
                    <a-menu-item @click="autoOptimize" :disabled="portfolioFunds.length < 2">
                      <ThunderboltOutlined /> 自动优化
                    </a-menu-item>
                    <a-menu-divider />
                    <a-menu-item @click="savePortfolio" :disabled="portfolioFunds.length === 0 || totalWeight !== 100">
                      <SaveOutlined /> {{ currentPortfolioId ? '更新组合' : '保存组合' }}
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </template>
          </template>

          <!-- 已选基金列表 -->
          <div class="table-scroll-wrapper">
          <a-table
            :data-source="portfolioFunds"
            :columns="isMobile ? mobilePortfolioColumns : portfolioColumns"
            :pagination="false"
            size="small"
            bordered
            :loading="loadingMetrics"
            :scroll="{ x: isMobile ? 700 : 1200 }"
          >
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === 'fund_name'">
                <div class="fund-cell">
                  <div class="name">{{ record.fund_name }}</div>
                  <div class="code">{{ record.fund_code }} | {{ record.fund_type || '混合型' }}</div>
                </div>
              </template>

              <template v-else-if="column.key === 'weight'">
                <div class="weight-cell">
                  <a-slider
                    v-if="portfolioConfig.strategy === 'custom'"
                    v-model:value="record.weight"
                    :min="0"
                    :max="100"
                    @change="onWeightChange"
                  />
                  <span v-else class="weight-value">{{ record.weight }}%</span>
                </div>
              </template>

              <template v-else-if="column.key === 'amount'">
                <span>¥ {{ calculateAmount(record.weight).toLocaleString() }}</span>
              </template>

              <template v-else-if="column.key === 'yearly_return'">
                <span :class="getRateClass(record.yearly_1_growth_rate)">
                  {{ formatRate(record.yearly_1_growth_rate) }}
                </span>
              </template>

              <template v-else-if="column.key === 'monthly_return'">
                <span :class="getRateClass(record.monthly_1_growth_rate)">
                  {{ formatRate(record.monthly_1_growth_rate) }}
                </span>
              </template>

              <template v-else-if="column.key === 'weekly_return'">
                <span :class="getRateClass(record.weekly_growth_rate)">
                  {{ formatRate(record.weekly_growth_rate) }}
                </span>
              </template>

              <template v-else-if="column.key === 'daily_return'">
                <span :class="getRateClass(record.daily_growth_rate)">
                  {{ formatRate(record.daily_growth_rate) }}
                </span>
              </template>

              <template v-else-if="column.key === 'fee_rate'">
                <span>{{ record.fee_rate ? record.fee_rate + '%' : '--' }}</span>
              </template>

              <template v-else-if="column.key === 'action'">
                <a-button type="link" danger @click="removeFromPortfolio(index)">
                  删除
                </a-button>
              </template>
            </template>

            <template #summary>
              <a-table-summary>
                <a-table-summary-row>
                  <a-table-summary-cell :col-span="1" :style="{ position: 'sticky', left: 0, background: '#fafafa', zIndex: 1 }">
                    <strong>合计</strong>
                  </a-table-summary-cell>
                  <a-table-summary-cell :col-span="8">
                    <a-space>
                      <a-tag :color="totalWeight === 100 ? 'green' : 'red'">
                        权重: {{ totalWeight }}%
                      </a-tag>
                      <span>金额: ¥ {{ portfolioConfig.amount?.toLocaleString() }}</span>
                      <span :class="getRateClass(expectedPortfolioReturn)">
                        收益: {{ formatRate(expectedPortfolioReturn) }}
                      </span>
                    </a-space>
                  </a-table-summary-cell>
                </a-table-summary-row>
              </a-table-summary>
            </template>
          </a-table>
          </div>

          <a-alert
            v-if="totalWeight !== 100"
            message="权重合计必须为100%才能保存"
            type="warning"
            show-icon
            style="margin-top: 16px"
          />

          <a-alert
            v-if="portfolioFunds.length === 0"
            message="请从左侧备选池或持仓中添加基金到组合"
            type="info"
            show-icon
            style="margin-top: 16px"
          />
        </a-card>

        <!-- 组合可视化 -->
        <a-row :gutter="16" style="margin-top: 16px" v-if="portfolioFunds.length > 0">
          <a-col :xs="24" :md="12">
            <a-card title="📈 配置分布" class="chart-card">
              <div ref="pieChartRef" class="chart"></div>
            </a-card>
          </a-col>
          
          <a-col :xs="24" :md="12">
            <a-card title="💰 收益贡献" class="chart-card">
              <div ref="barChartRef" class="chart"></div>
            </a-card>
          </a-col>
        </a-row>

        <!-- 组合风险评估 -->
        <a-card title="🛡️ 组合风险评估" class="risk-card" style="margin-top: 16px" v-if="portfolioFunds.length > 0">
          <a-row :gutter="16">
            <a-col :xs="12" :md="6">
              <div class="risk-metric">
                <div class="label">预期年化收益</div>
                <div class="value" :class="getRateClass(expectedPortfolioReturn)">
                  {{ formatRate(expectedPortfolioReturn) }}
                </div>
              </div>
            </a-col>
            <a-col :xs="12" :md="6">
              <div class="risk-metric">
                <div class="label">组合波动率</div>
                <div class="value">{{ portfolioMetrics.volatility?.toFixed(2) || '--' }}%</div>
              </div>
            </a-col>
            <a-col :xs="12" :md="6">
              <div class="risk-metric">
                <div class="label">夏普比率</div>
                <div class="value" :class="getSharpeClass(portfolioMetrics.sharpe_ratio)">
                  {{ portfolioMetrics.sharpe_ratio?.toFixed(2) || '--' }}
                </div>
              </div>
            </a-col>
            <a-col :xs="12" :md="6">
              <div class="risk-metric">
                <div class="label">风险等级</div>
                <a-tag :color="riskLevel.color">{{ riskLevel.text }}</a-tag>
              </div>
            </a-col>
          </a-row>

          <a-divider />

          <a-row :gutter="16">
            <a-col :xs="12" :md="6">
              <div class="risk-metric secondary">
                <div class="label">基金数量</div>
                <div class="value">{{ portfolioFunds.length }} 只</div>
              </div>
            </a-col>
            <a-col :xs="12" :md="6">
              <div class="risk-metric secondary">
                <div class="label">加权手续费率</div>
                <div class="value">{{ weightedFeeRate.toFixed(2) }}%</div>
              </div>
            </a-col>
            <a-col :xs="12" :md="6">
              <div class="risk-metric secondary">
                <div class="label">预计年费</div>
                <div class="value">¥ {{ estimatedAnnualFee.toLocaleString() }}</div>
              </div>
            </a-col>
            <a-col :xs="12" :md="6">
              <div class="risk-metric secondary">
                <div class="label">配置策略</div>
                <div class="value" style="font-size: 14px;">{{ strategyLabel(portfolioConfig.strategy) }}</div>
              </div>
            </a-col>
          </a-row>
        </a-card>
      </a-col>
    </a-row>

    <!-- 新建/编辑组合弹窗 -->
    <a-modal
      v-model:visible="showCreateModal"
      title="新建组合"
      @ok="createNewPortfolio"
      @cancel="showCreateModal = false"
      :confirm-loading="creating"
    >
      <a-form :model="newPortfolioForm" layout="vertical">
        <a-form-item label="组合名称" required>
          <a-input v-model:value="newPortfolioForm.name" placeholder="输入组合名称" />
        </a-form-item>
        <a-form-item label="投资目标">
          <a-radio-group v-model:value="newPortfolioForm.goal">
            <a-radio-button value="conservative">保守型</a-radio-button>
            <a-radio-button value="balanced">平衡型</a-radio-button>
            <a-radio-button value="aggressive">进取型</a-radio-button>
          </a-radio-group>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { message, Empty } from 'ant-design-vue'
import * as echarts from 'echarts'
import {
  EditOutlined, ThunderboltOutlined, SaveOutlined, ReloadOutlined,
  PlusOutlined, MoreOutlined, EyeOutlined, StarOutlined, DeleteOutlined, ClearOutlined,
  SettingOutlined
} from '@ant-design/icons-vue'
import { fundPortfolioApi, fundAnalysisApi, fundBaseApi } from '@/api/fundModel.js'

const props = defineProps({
  fundPool: {
    type: Array,
    default: () => []
  },
  myHoldings: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['save-portfolio', 'load-holdings'])

// ========== 响应式检测 ==========
const isMobile = ref(false)

function checkMobile() {
  isMobile.value = window.innerWidth < 768
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

// ========== 组合列表相关 ==========
const savedPortfolios = ref([])
const loadingPortfolios = ref(false)
const currentPortfolioId = ref(null)
const showCreateModal = ref(false)
const creating = ref(false)
const newPortfolioForm = ref({
  name: '',
  goal: 'balanced'
})

// ========== 当前组合配置 ==========
const portfolioConfig = ref({
  name: '我的基金组合',
  goal: 'balanced',
  strategy: 'equal',
  amount: 100000
})

const portfolioFunds = ref([])
const myHoldings = ref([])
const loadingHoldings = ref(false)
const loadingMetrics = ref(false)
const optimizing = ref(false)
const saving = ref(false)

const portfolioMetrics = ref({
  expected_annual_return: 0,
  volatility: 0,
  sharpe_ratio: 0,
  risk_level: 'medium'
})

const portfolioColumns = [
  { title: '基金', key: 'fund_name', width: 180 },
  { title: '配置权重', key: 'weight', width: 150, align: 'center' },
  { title: '投资金额', key: 'amount', width: 120, align: 'right' },
  { title: '年度收益', key: 'yearly_return', width: 90, align: 'right' },
  { title: '月度收益', key: 'monthly_return', width: 90, align: 'right' },
  { title: '周收益', key: 'weekly_return', width: 80, align: 'right' },
  { title: '日收益', key: 'daily_return', width: 80, align: 'right' },
  { title: '费率', key: 'fee_rate', width: 70, align: 'right' },
  { title: '操作', key: 'action', width: 80, align: 'center' }
]

// 移动端表格列定义
const mobilePortfolioColumns = [
  { title: '基金', key: 'fund_name', width: 120, fixed: 'left' },
  { title: '权重', key: 'weight', width: 70, align: 'center' },
  { title: '金额', key: 'amount', width: 80, align: 'right' },
  { title: '年收益', key: 'yearly_return', width: 70, align: 'right' },
  { title: '月收益', key: 'monthly_return', width: 70, align: 'right' },
  { title: '周收益', key: 'weekly_return', width: 60, align: 'right' },
  { title: '日收益', key: 'daily_return', width: 60, align: 'right' },
  { title: '费率', key: 'fee_rate', width: 50, align: 'right' },
  { title: '操作', key: 'action', width: 50, align: 'center' }
]

const pieChartRef = ref(null)
const barChartRef = ref(null)

// ========== 策略标签 ==========
function strategyLabel(strategy) {
  const map = {
    'equal': '等权重',
    'risk_parity': '风险平价',
    'max_sharpe': '最大夏普',
    'min_variance': '最小方差',
    'custom': '自定义'
  }
  return map[strategy] || strategy
}

// ========== 组合列表操作 ==========
async function loadPortfolioList() {
  loadingPortfolios.value = true
  try {
    const response = await fundPortfolioApi.getPortfolioList('default', false)
    if (response.success) {
      savedPortfolios.value = response.data || []
    } else {
      message.error(response.message || '加载组合列表失败')
    }
  } catch (error) {
    console.error('加载组合列表失败:', error)
    message.error('加载组合列表失败')
  } finally {
    loadingPortfolios.value = false
  }
}

async function loadPortfolio(portfolio) {
  try {
    const response = await fundPortfolioApi.getPortfolioDetail(portfolio.id)
    if (response.success) {
      const data = response.data
      currentPortfolioId.value = data.id
      portfolioConfig.value = {
        name: data.name,
        goal: data.goal,
        strategy: data.strategy,
        amount: data.amount
      }
      
      // 加载组合基金
      portfolioFunds.value = data.items.map(item => ({
        fund_code: item.fund_code,
        fund_name: item.fund_name,
        fund_type: item.fund_type,
        weight: Math.round(item.weight),
        yearly_1_growth_rate: item.current_yearly_return,
        monthly_1_growth_rate: item.saved_monthly_return,
        weekly_growth_rate: item.saved_weekly_return,
        daily_growth_rate: item.current_daily_return,
        fee_rate: item.fee_rate,
        net_value: item.current_net_value
      }))
      
      message.success(`已加载组合: ${data.name}`)
      calculatePortfolioMetrics()
      initCharts()
    }
  } catch (error) {
    console.error('加载组合详情失败:', error)
    message.error('加载组合详情失败')
  }
}

async function createNewPortfolio() {
  if (!newPortfolioForm.value.name.trim()) {
    message.warning('请输入组合名称')
    return
  }
  
  creating.value = true
  try {
    portfolioConfig.value.name = newPortfolioForm.value.name
    portfolioConfig.value.goal = newPortfolioForm.value.goal
    currentPortfolioId.value = null
    portfolioFunds.value = []
    showCreateModal.value = false
    message.success('新组合已创建，请添加基金')
  } finally {
    creating.value = false
  }
}

async function deletePortfolio(id) {
  try {
    const response = await fundPortfolioApi.deletePortfolio(id)
    if (response.success) {
      message.success('组合删除成功')
      loadPortfolioList()
      if (currentPortfolioId.value === id) {
        currentPortfolioId.value = null
        clearPortfolio()
      }
    } else {
      message.error(response.message || '删除失败')
    }
  } catch (error) {
    console.error('删除组合失败:', error)
    message.error('删除组合失败')
  }
}

async function setDefaultPortfolio(id) {
  try {
    const response = await fundPortfolioApi.setDefaultPortfolio(id)
    if (response.success) {
      message.success('默认组合设置成功')
      loadPortfolioList()
    } else {
      message.error(response.message || '设置失败')
    }
  } catch (error) {
    console.error('设置默认组合失败:', error)
    message.error('设置默认组合失败')
  }
}

function clearPortfolio() {
  portfolioFunds.value = []
  currentPortfolioId.value = null
  portfolioConfig.value.name = '我的基金组合'
  calculatePortfolioMetrics()
}

// ========== 基金操作 ==========
function isInPortfolio(fund) {
  return portfolioFunds.value.some(f => f.fund_code === fund.fund_code)
}

function addToPortfolio(fund) {
  if (isInPortfolio(fund)) {
    message.warning('该基金已在组合中')
    return
  }
  
  // 检查是否符合投资目标的风险偏好
  const riskFilter = goalConstraint.value.riskFilter
  if (!riskFilter(fund)) {
    const yearly = parseFloat(fund.yearly_1_growth_rate) || 0
    const goalName = portfolioConfig.value.goal === 'conservative' ? '保守型' : '进取型'
    message.warning(`${fund.fund_name} 年收益${yearly.toFixed(2)}%，可能不符合${goalName}策略的风险偏好`)
    // 不阻止添加，只是提示
  }
  
  portfolioFunds.value.push({
    ...fund,
    weight: 0
  })
  
  recalculateWeights()
  message.success(`已添加 ${fund.fund_name}`)
}

function removeFromPortfolio(index) {
  portfolioFunds.value.splice(index, 1)
  recalculateWeights()
}

async function loadMyHoldings() {
  loadingHoldings.value = true
  try {
    const response = await fundBaseApi.getMyHoldings()
    if (response.success) {
      myHoldings.value = response.data.items || []
      if (myHoldings.value.length > 0) {
        await enrichHoldingsWithFundInfo()
      }
      message.success(`已加载 ${myHoldings.value.length} 条持仓`)
    } else {
      message.error(response.message || '加载持仓失败')
    }
  } catch (error) {
    console.error('加载持仓失败:', error)
    message.error('加载持仓失败')
  } finally {
    loadingHoldings.value = false
  }
}

async function enrichHoldingsWithFundInfo() {
  const fundCodes = myHoldings.value.map(h => h.fund_code)
  if (fundCodes.length === 0) return
  
  try {
    const response = await fundAnalysisApi.getMetrics(fundCodes.join(','))
    if (response.success && response.data) {
      const fundMap = {}
      response.data.forEach(fund => {
        fundMap[fund.fund_code] = fund
      })
      
      myHoldings.value = myHoldings.value.map(holding => ({
        ...holding,
        ...fundMap[holding.fund_code]
      }))
    }
  } catch (error) {
    console.error('获取基金详细信息失败:', error)
  }
}

function addHoldingsToPortfolio() {
  let addedCount = 0
  let duplicateCount = 0
  
  myHoldings.value.forEach(holding => {
    if (!isInPortfolio(holding)) {
      portfolioFunds.value.push({
        ...holding,
        weight: 0
      })
      addedCount++
    } else {
      duplicateCount++
    }
  })
  
  if (addedCount > 0) {
    recalculateWeights()
    message.success(`已添加 ${addedCount} 只持仓基金到组合`)
  }
  if (duplicateCount > 0) {
    message.warning(`${duplicateCount} 只基金已在组合中`)
  }
}

// ========== 投资目标约束 ==========
const goalConstraint = computed(() => {
  switch (portfolioConfig.value.goal) {
    case 'conservative':
      return {
        title: '🛡️ 保守型策略约束',
        description: '单只基金权重≤30%，建议配置债券/货币型基金，推荐等权重或风险平价策略',
        type: 'info',
        maxWeight: 30,
        suggestedStrategies: ['equal', 'risk_parity', 'min_variance'],
        riskFilter: (fund) => {
          const yearly = parseFloat(fund.yearly_1_growth_rate) || 0
          return yearly < 20 // 保守型偏好低收益低风险基金
        }
      }
    case 'balanced':
      return {
        title: '⚖️ 平衡型策略约束',
        description: '单只基金权重≤40%，股债均衡配置，推荐最大夏普比率策略',
        type: 'success',
        maxWeight: 40,
        suggestedStrategies: ['max_sharpe', 'risk_parity', 'equal'],
        riskFilter: () => true // 平衡型接受各类基金
      }
    case 'aggressive':
      return {
        title: '🚀 进取型策略约束',
        description: '单只基金权重≤50%，优选股票型/高夏普基金，推荐最大夏普或最小方差策略',
        type: 'warning',
        maxWeight: 50,
        suggestedStrategies: ['max_sharpe', 'min_variance', 'risk_parity'],
        riskFilter: (fund) => {
          const yearly = parseFloat(fund.yearly_1_growth_rate) || 0
          return yearly > 0 // 进取型偏好正收益基金
        }
      }
    default:
      return {
        title: '⚖️ 平衡型策略约束',
        description: '单只基金权重≤40%，股债均衡配置',
        type: 'success',
        maxWeight: 40,
        suggestedStrategies: ['max_sharpe', 'risk_parity', 'equal'],
        riskFilter: () => true
      }
  }
})

// 检查权重是否符合投资目标约束
function checkWeightConstraints(weights) {
  const maxWeight = goalConstraint.value.maxWeight
  const constrainedWeights = weights.map(w => Math.min(w, maxWeight))
  
  // 重新归一化
  const total = constrainedWeights.reduce((a, b) => a + b, 0)
  if (total === 0) return constrainedWeights
  
  return constrainedWeights.map(w => Math.round((w / total) * 100))
}

function onGoalChange() {
  // 投资目标改变时，检查当前策略是否推荐
  const suggested = goalConstraint.value.suggestedStrategies
  if (!suggested.includes(portfolioConfig.value.strategy)) {
    // 自动切换到推荐策略
    portfolioConfig.value.strategy = suggested[0]
    message.info(`已自动切换为${strategyLabel(suggested[0])}，更符合您的投资目标`)
  }
  
  // 重新计算权重（应用新的约束）
  if (portfolioFunds.value.length > 0) {
    recalculateWeights()
  }
}

function recalculateWeights() {
  const count = portfolioFunds.value.length
  if (count === 0) return
  
  let weights = []
  
  switch (portfolioConfig.value.strategy) {
    case 'equal':
      const equalWeight = Math.floor(100 / count)
      weights = portfolioFunds.value.map((_, i) => 
        i === count - 1 ? 100 - equalWeight * (count - 1) : equalWeight
      )
      break
      
    case 'max_sharpe':
      const sharpes = portfolioFunds.value.map(f => {
        const return_rate = parseFloat(f.yearly_1_growth_rate) || 0
        const volatility = Math.abs(return_rate) * 0.6 || 15
        return return_rate > 0 ? return_rate / volatility : 0.1
      })
      const totalSharpe = sharpes.reduce((a, b) => a + b, 0)
      weights = sharpes.map(s => Math.round((s / totalSharpe) * 100))
      break
      
    case 'risk_parity':
      // 真正的风险平价：权重与风险（波动率）成反比
      // 目标是让每个基金对组合总风险的贡献相等
      const riskVols = portfolioFunds.value.map(f => {
        // 使用历史收益率估算年化波动率
        const return_rate = parseFloat(f.yearly_1_growth_rate) || 0
        // 年化波动率 ≈ |年化收益| × 0.6（简化估算）
        // 或者用月/周收益估算更精确
        const monthly_return = parseFloat(f.monthly_1_growth_rate) || 0
        const weekly_return = parseFloat(f.weekly_growth_rate) || 0
        
        // 综合估算波动率（优先使用多维度数据）
        let volatility
        if (monthly_return !== 0) {
          // 基于月收益年化：月波动 × √12
          const monthly_vol = Math.abs(monthly_return)
          volatility = monthly_vol * Math.sqrt(12)
        } else if (weekly_return !== 0) {
          // 基于周收益年化：周波动 × √52
          const weekly_vol = Math.abs(weekly_return)
          volatility = weekly_vol * Math.sqrt(52)
        } else {
          // 基于年收益倒推
          volatility = Math.abs(return_rate) * 0.6 || 15
        }
        
        return Math.max(volatility, 5) // 最低5%波动率，避免极端
      })
      
      // 风险平价权重 = 1/波动率，然后归一化
      const riskBudgets = riskVols.map(v => 1 / v)
      const totalRiskBudget = riskBudgets.reduce((a, b) => a + b, 0)
      weights = riskBudgets.map(rb => Math.round((rb / totalRiskBudget) * 100))
      break
      
    case 'min_variance':
      const volatilities = portfolioFunds.value.map(f => {
        const return_rate = parseFloat(f.yearly_1_growth_rate) || 0
        return Math.abs(return_rate) || 15
      })
      const totalVol = volatilities.reduce((a, b) => a + b, 0)
      const inverseVols = volatilities.map(v => totalVol / v)
      const totalInverse = inverseVols.reduce((a, b) => a + b, 0)
      weights = inverseVols.map(v => Math.round((v / totalInverse) * 100))
      break
      
    default:
      weights = portfolioFunds.value.map(() => Math.floor(100 / count))
  }
  
  portfolioFunds.value.forEach((fund, i) => {
    fund.weight = weights[i] || 0
  })
  
  // 应用投资目标的权重约束
  const constrainedWeights = checkWeightConstraints(weights)
  portfolioFunds.value.forEach((fund, i) => {
    fund.weight = constrainedWeights[i] || 0
  })
  
  const currentTotal = portfolioFunds.value.reduce((sum, f) => sum + f.weight, 0)
  if (portfolioFunds.value.length > 0 && currentTotal !== 100) {
    // 找到权重最大的基金进行调整
    const maxIndex = portfolioFunds.value.reduce((maxIdx, fund, idx, arr) => 
      fund.weight > arr[maxIdx].weight ? idx : maxIdx, 0)
    portfolioFunds.value[maxIndex].weight += (100 - currentTotal)
  }
  
  calculatePortfolioMetrics()
}

function onStrategyChange() {
  if (portfolioConfig.value.strategy !== 'custom') {
    recalculateWeights()
  } else {
    // 切换到自定义时提示投资目标的约束
    const maxWeight = goalConstraint.value.maxWeight
    message.info(`自定义权重模式下，单只基金建议不超过${maxWeight}%（${goalConstraint.value.title.replace('策略约束', '')}）`)
  }
}

function onWeightChange() {
  // 检查自定义权重是否违反投资目标约束
  if (portfolioConfig.value.strategy === 'custom') {
    const maxWeight = goalConstraint.value.maxWeight
    const overweightFunds = portfolioFunds.value.filter(f => f.weight > maxWeight)
    
    if (overweightFunds.length > 0) {
      message.warning(`${overweightFunds.map(f => f.fund_name).join('、')} 权重超过${maxWeight}%，不符合当前投资目标约束`)
    }
  }
  calculatePortfolioMetrics()
}

function calculateAmount(weight) {
  return Math.round((portfolioConfig.value.amount || 0) * (weight / 100))
}

const totalWeight = computed(() => {
  return portfolioFunds.value.reduce((sum, f) => sum + (f.weight || 0), 0)
})

const expectedPortfolioReturn = computed(() => {
  if (portfolioFunds.value.length === 0) return 0
  
  const total = portfolioFunds.value.reduce((sum, fund) => {
    const return_rate = parseFloat(fund.yearly_1_growth_rate) || 0
    return sum + (return_rate * (fund.weight / 100))
  }, 0)
  
  return total
})

const weightedFeeRate = computed(() => {
  if (portfolioFunds.value.length === 0) return 0
  
  const total = portfolioFunds.value.reduce((sum, fund) => {
    const fee = parseFloat(fund.fee_rate) || 0
    return sum + (fee * (fund.weight / 100))
  }, 0)
  
  return total
})

const estimatedAnnualFee = computed(() => {
  return (portfolioConfig.value.amount || 0) * (weightedFeeRate.value / 100)
})

const riskLevel = computed(() => {
  const sharpe = portfolioMetrics.value.sharpe_ratio || 0
  const volatility = portfolioMetrics.value.volatility || 0
  
  if (sharpe >= 1.5 && volatility < 15) return { text: '低风险', color: 'green' }
  if (sharpe >= 1.0 && volatility < 20) return { text: '中低风险', color: 'blue' }
  if (sharpe >= 0.5 && volatility < 25) return { text: '中风险', color: 'orange' }
  return { text: '高风险', color: 'red' }
})

async function calculatePortfolioMetrics() {
  if (portfolioFunds.value.length === 0) {
    portfolioMetrics.value = {
      expected_annual_return: 0,
      volatility: 0,
      sharpe_ratio: 0,
      risk_level: 'medium'
    }
    return
  }
  
  const funds = portfolioFunds.value.map(f => ({
    fund_code: f.fund_code,
    weight: (f.weight || 0) / 100
  }))
  
  const totalWeightValue = funds.reduce((sum, f) => sum + f.weight, 0)
  if (Math.abs(totalWeightValue - 1.0) > 0.01) {
    const vol = Math.abs(expectedPortfolioReturn.value) * 0.6 || 15
    const sharpe = vol > 0 ? (expectedPortfolioReturn.value - 3) / vol : 0
    portfolioMetrics.value = {
      expected_annual_return: expectedPortfolioReturn.value,
      volatility: vol,
      sharpe_ratio: sharpe,
      risk_level: sharpe < 0.5 ? 'high' : sharpe < 1.0 ? 'medium' : 'low'
    }
    return
  }
  
  loadingMetrics.value = true
  try {
    const response = await fundAnalysisApi.calculateMetrics(funds)
    if (response.success) {
      portfolioMetrics.value = response.data
    } else {
      const vol = Math.abs(expectedPortfolioReturn.value) * 0.6 || 15
      const sharpe = vol > 0 ? (expectedPortfolioReturn.value - 3) / vol : 0
      portfolioMetrics.value = {
        expected_annual_return: expectedPortfolioReturn.value,
        volatility: vol,
        sharpe_ratio: sharpe,
        risk_level: sharpe < 0.5 ? 'high' : sharpe < 1.0 ? 'medium' : 'low'
      }
    }
  } catch (error) {
    console.error('计算组合指标失败:', error)
    const vol = Math.abs(expectedPortfolioReturn.value) * 0.6 || 15
    const sharpe = vol > 0 ? (expectedPortfolioReturn.value - 3) / vol : 0
    portfolioMetrics.value = {
      expected_annual_return: expectedPortfolioReturn.value,
      volatility: vol,
      sharpe_ratio: sharpe,
      risk_level: sharpe < 0.5 ? 'high' : sharpe < 1.0 ? 'medium' : 'low'
    }
  } finally {
    loadingMetrics.value = false
  }
}

async function autoOptimize() {
  if (portfolioFunds.value.length === 0) {
    message.warning('组合不能为空')
    return
  }
  
  // 根据投资目标选择最优策略
  const suggestedStrategies = goalConstraint.value.suggestedStrategies
  const optimalStrategy = suggestedStrategies[0] // 使用第一个推荐策略
  
  optimizing.value = true
  try {
    const fundCodes = portfolioFunds.value.map(f => f.fund_code)
    const response = await fundPortfolioApi.optimizePortfolio(fundCodes, optimalStrategy)
    
    if (response.success && response.data.weights) {
      const weights = response.data.weights
      
      portfolioFunds.value.forEach(fund => {
        const weight = weights[fund.fund_code]
        if (weight !== undefined) {
          fund.weight = Math.round(weight * 100)
        }
      })
      
      portfolioConfig.value.strategy = 'custom'
      const strategyName = strategyLabel(optimalStrategy)
      const goalName = goalConstraint.value.title.replace('策略约束', '')
      message.success(`已按${strategyName}优化配置（${goalName}推荐）`)
      await calculatePortfolioMetrics()
    } else {
      // 后端优化失败，使用前端算法
      portfolioConfig.value.strategy = optimalStrategy
      recalculateWeights()
      message.success(`已按${strategyLabel(optimalStrategy)}优化配置（本地计算）`)
    }
  } catch (error) {
    console.error('组合优化失败:', error)
    // 使用投资目标推荐的策略
    portfolioConfig.value.strategy = optimalStrategy
    recalculateWeights()
    message.success(`已按${strategyLabel(optimalStrategy)}优化配置（本地计算）`)
  } finally {
    optimizing.value = false
  }
}

async function savePortfolio() {
  if (portfolioFunds.value.length === 0) {
    message.error('组合不能为空')
    return
  }
  
  if (totalWeight.value !== 100) {
    message.error('权重合计必须等于100%')
    return
  }
  
  saving.value = true
  try {
    const data = {
      name: portfolioConfig.value.name,
      goal: portfolioConfig.value.goal,
      strategy: portfolioConfig.value.strategy,
      amount: portfolioConfig.value.amount,
      funds: portfolioFunds.value.map(f => ({
        fund_code: f.fund_code,
        weight: f.weight,
        amount: calculateAmount(f.weight)
      })),
      metrics: {
        expected_return: expectedPortfolioReturn.value,
        volatility: portfolioMetrics.value.volatility,
        sharpe_ratio: portfolioMetrics.value.sharpe_ratio,
        risk_level: portfolioMetrics.value.risk_level || 'medium',
        weighted_fee_rate: weightedFeeRate.value
      }
    }
    
    let response
    if (currentPortfolioId.value) {
      response = await fundPortfolioApi.updatePortfolio(currentPortfolioId.value, data)
    } else {
      response = await fundPortfolioApi.createPortfolio(data)
    }
    
    if (response.success) {
      message.success(currentPortfolioId.value ? '组合更新成功' : '组合保存成功')
      if (!currentPortfolioId.value && response.data.id) {
        currentPortfolioId.value = response.data.id
      }
      loadPortfolioList()
      emit('save-portfolio', { ...data, id: currentPortfolioId.value })
    } else {
      message.error(response.message || '保存失败')
    }
  } catch (error) {
    console.error('保存组合失败:', error)
    message.error('保存失败')
  } finally {
    saving.value = false
  }
}

// ========== 格式化函数 ==========
function formatRate(value) {
  if (value == null || value === '') return '--'
  const num = parseFloat(value)
  if (isNaN(num)) return '--'
  return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`
}

function formatNumber(value) {
  if (value == null) return '--'
  const num = parseFloat(value)
  if (isNaN(num)) return '--'
  return num.toLocaleString()
}

function formatDate(dateStr) {
  if (!dateStr) return '--'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

function getRateClass(value) {
  const num = parseFloat(value)
  if (isNaN(num)) return ''
  return num >= 0 ? 'text-up' : 'text-down'
}

function getSharpeClass(value) {
  if (value >= 2) return 'text-excellent'
  if (value >= 1) return 'text-good'
  return ''
}

function sharpeColor(value) {
  if (value >= 2) return 'green'
  if (value >= 1) return 'blue'
  if (value >= 0.5) return 'orange'
  return 'red'
}

function getFundTypeColor(fundType) {
  if (!fundType) return '#1890ff'
  if (fundType.includes('股票')) return '#f5222d'
  if (fundType.includes('债券')) return '#52c41a'
  if (fundType.includes('指数')) return '#faad14'
  if (fundType.includes('货币')) return '#13c2c2'
  if (fundType.includes('QDII')) return '#722ed1'
  return '#1890ff'
}

// ========== 图表 ==========
function initCharts() {
  nextTick(() => {
    initPieChart()
    initBarChart()
  })
}

function initPieChart() {
  if (!pieChartRef.value || portfolioFunds.value.length === 0) return
  
  const chart = echarts.init(pieChartRef.value)
  const data = portfolioFunds.value.map(fund => ({
    name: fund.fund_name?.substring(0, 8) + '...',
    value: fund.weight,
    code: fund.fund_code
  }))

  chart.setOption({
    tooltip: { 
      trigger: 'item', 
      formatter: (params) => {
        return `${params.name}<br/>权重: ${params.value}%<br/>代码: ${params.data.code}`
      }
    },
    legend: { 
      show: !isMobile.value,
      orient: 'vertical', 
      left: 'left', 
      top: 'center',
      textStyle: { fontSize: 11 }
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: isMobile.value ? ['50%', '50%'] : ['60%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 10,
        borderColor: '#fff',
        borderWidth: 2
      },
      label: { show: false },
      emphasis: {
        label: { show: true, fontSize: 14, fontWeight: 'bold' }
      },
      data
    }]
  })
}

function initBarChart() {
  if (!barChartRef.value || portfolioFunds.value.length === 0) return
  
  const chart = echarts.init(barChartRef.value)
  const funds = portfolioFunds.value

  chart.setOption({
    tooltip: { 
      trigger: 'axis', 
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const data = params[0]
        const fund = funds[data.dataIndex]
        return `${fund.fund_name}<br/>权重: ${fund.weight}%<br/>收益贡献: ${data.value}%`
      }
    },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { 
      type: 'category', 
      data: funds.map(f => f.fund_name?.substring(0, 6) + '...'),
      axisLabel: { rotate: 30, fontSize: 10 }
    },
    yAxis: { type: 'value', name: '收益贡献(%)' },
    series: [{
      type: 'bar',
      data: funds.map(f => {
        const return_rate = parseFloat(f.yearly_1_growth_rate) || 0
        return parseFloat((return_rate * (f.weight / 100)).toFixed(2))
      }),
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#83bff6' },
          { offset: 0.5, color: '#188df0' },
          { offset: 1, color: '#188df0' }
        ])
      }
    }]
  })
}

watch(portfolioFunds, () => {
  initCharts()
}, { deep: true })

watch(() => portfolioFunds.value.length, () => {
  calculatePortfolioMetrics()
})

onMounted(async () => {
  await loadPortfolioList()
  await loadMyHoldings()
  
  if (props.myHoldings && props.myHoldings.length > 0) {
    myHoldings.value = props.myHoldings
    await enrichHoldingsWithFundInfo()
  }
  
  initCharts()
})
</script>

<style scoped lang="less">
.fund-portfolio {
  .portfolio-list-card {
    .portfolio-item-card {
      cursor: pointer;
      transition: all 0.3s;

      &:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transform: translateY(-2px);
      }

      &.is-default {
        border: 2px solid #52c41a;
      }

      .portfolio-date {
        margin-top: 8px;
        font-size: 12px;
        color: #8c8c8c;
      }
    }
  }

  .config-card {
    height: 100%;
  }

  .portfolio-card {
    min-height: 400px;
  }

  .pool-section {
    max-height: 350px;
    overflow-y: auto;
  }

  .holdings-section {
    max-height: 200px;
    overflow-y: auto;
  }

  .fund-cell {
    .name {
      font-weight: 500;
    }
    .code {
      font-size: 12px;
      color: #8c8c8c;
    }
  }

  .weight-cell {
    padding: 0 8px;
  }

  .weight-value {
    font-weight: 600;
    color: #1890ff;
  }

  .text-up {
    color: #f5222d;
    font-weight: 500;
  }

  .text-down {
    color: #52c41a;
    font-weight: 500;
  }

  .text-excellent {
    color: #52c41a;
    font-weight: 700;
  }

  .text-good {
    color: #1890ff;
    font-weight: 500;
  }

  .chart-card {
    .chart {
      height: 280px;
    }
  }

  .risk-card {
    .risk-metric {
      text-align: center;
      padding: 16px;
      background: #f6ffed;
      border-radius: 8px;

      .label {
        font-size: 12px;
        color: #8c8c8c;
        margin-bottom: 8px;
      }

      .value {
        font-size: 24px;
        font-weight: 700;
      }

      &.secondary {
        padding: 12px;
        background: #f0f5ff;

        .value {
          font-size: 18px;
        }
      }
    }
  }
}

/* 移动端适配 */
@media (max-width: 768px) {
  :deep(.ant-card) {
    margin-bottom: 8px;
    border-radius: 8px;
  }
  :deep(.ant-card-body) {
    padding: 12px;
  }
  /* 表格移动端横向滚动 */
  .table-scroll-wrapper {
    overflow-x: auto;
  }
  :deep(.ant-table) {
    font-size: 12px;
  }
  :deep(.ant-table-thead > tr > th) {
    padding: 8px;
    font-size: 11px;
  }
  :deep(.ant-table-tbody > tr > td) {
    padding: 8px;
  }
  :deep(.ant-statistic) {
    font-size: 14px;
  }
  :deep(.ant-statistic-title) {
    font-size: 11px;
  }
}

/* 移动端卡片 */
.mobile-stock-list { padding: 0; }
.stock-card {
  background: #fff;
  border-radius: 8px;
  margin-bottom: 8px;
  padding: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}
.stock-card .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.stock-card .stock-name { font-size: 14px; font-weight: 600; }
.stock-card .stock-code { font-size: 11px; color: #888; }
.stock-card .card-body { display: flex; flex-direction: column; gap: 6px; }
.stock-card .card-row {
  display: flex;
  justify-content: space-between;
  background: #fafafa;
  padding: 6px 8px;
  border-radius: 6px;
}
.stock-card .card-item { flex: 1; text-align: center; }
.stock-card .card-item .label { display: block; font-size: 10px; color: #888; }
.stock-card .card-item .value { display: block; font-size: 12px; font-weight: 500; }
.text-up { color: #f5222d; }
.text-down { color: #52c41a; }
</style>
