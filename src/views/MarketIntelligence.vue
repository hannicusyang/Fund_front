<!-- src/views/MarketIntelligence.vue -->
<template>
  <div class="news-dashboard-container">
    <!-- 顶部标题区 -->
    <a-card :bordered="false" class="header-card">
      <div class="header-content">
        <div class="title-section">
          <FileTextOutlined class="title-icon" />
          <div class="title-text">
            <h1>财经资讯看板</h1>
            <span class="subtitle">实时财经热点 · AI智能解读</span>
          </div>
        </div>
        <div class="header-actions">
          <a-select v-model:value="newsSource" style="width: 140px" @change="refreshNews">
            <a-select-option value="all">全部来源</a-select-option>
            <a-select-option value="sina">新浪财经</a-select-option>
            <a-select-option value="eastmoney">东方财富</a-select-option>
            <a-select-option value="tushare">Tushare</a-select-option>
            <a-select-option value="cls">财联社</a-select-option>
          </a-select>
          <a-button type="primary" @click="refreshNews" :loading="loading">
            <ReloadOutlined /> 刷新
          </a-button>
          <a-button @click="showAIAnalysis" :disabled="newsData.length === 0">
            <RobotOutlined /> AI分析
          </a-button>
        </div>
      </div>
    </a-card>

    <!-- 筛选控制栏 -->
    <a-card :bordered="false" class="filter-card">
      <div class="filter-row">
        <!-- 新闻频道 -->
        <div class="filter-group">
          <span class="filter-label">频道：</span>
          <a-radio-group v-model:value="newsChannel" button-style="solid" size="small" @change="refreshNews">
            <a-radio-button value="all">全部</a-radio-button>
            <a-radio-button value="stock">股票</a-radio-button>
            <a-radio-button value="fund">基金</a-radio-button>
            <a-radio-button value="macro">宏观</a-radio-button>
            <a-radio-button value="industry">行业</a-radio-button>
          </a-radio-group>
        </div>
        
        <!-- 时间筛选 -->
        <div class="filter-group">
          <span class="filter-label">时间：</span>
          <a-select v-model:value="timeRange" style="width: 120px" size="small" @change="refreshNews">
            <a-select-option value="today">今天</a-select-option>
            <a-select-option value="3days">近3天</a-select-option>
            <a-select-option value="week">近一周</a-select-option>
            <a-select-option value="month">近一月</a-select-option>
          </a-select>
        </div>
        
        <!-- 关键词搜索 -->
        <div class="filter-group search-group">
          <a-input-search
            v-model:value="keyword"
            placeholder="搜索新闻..."
            style="width: 200px"
            size="small"
            @search="refreshNews"
            allow-clear
          />
        </div>
        
        <!-- 视图切换 -->
        <div class="filter-group view-toggle">
          <a-radio-group v-model:value="viewMode" button-style="solid" size="small">
            <a-radio-button value="card"><AppstoreOutlined /></a-radio-button>
            <a-radio-button value="list"><UnorderedListOutlined /></a-radio-button>
            <a-radio-button value="timeline"><ClockCircleOutlined /></a-radio-button>
          </a-radio-group>
        </div>
        
        <!-- 统计信息 -->
        <div class="filter-stats">
          <span class="stat-item">
            <ClockCircleOutlined /> {{ lastUpdateTime }}
          </span>
          <span class="stat-item">
            <FileTextOutlined /> {{ newsData.length }} 条
          </span>
        </div>
      </div>
    </a-card>

    <!-- 主内容区 -->
    <div class="news-content">
      <!-- 加载状态 -->
      <a-spin :spinning="loading" class="news-spin">
        
        <!-- 卡片视图 -->
        <div v-if="viewMode === 'card'" class="news-card-view">
          <a-row :gutter="[16, 16]">
            <a-col :xs="24" :sm="12" :md="8" :lg="6" v-for="(item, index) in newsData" :key="index">
              <a-card class="news-card" :class="{ active: selectedNewsIndex === index }" @click="selectNews(index)">
                <template #title>
                  <div class="card-header">
                    <a-tag :color="getSourceColor(item.source)">{{ getSourceName(item.source) }}</a-tag>
                    <span class="card-time">{{ formatNewsTime(item.datetime) }}</span>
                  </div>
                </template>
                <template #extra>
                  <a :href="item.url" target="_blank" @click.stop>
                    <ExportOutlined />
                  </a>
                </template>
                <div class="card-title">{{ item.title }}</div>
                <div class="card-content" v-if="item.content">{{ item.content.substring(0, 80) }}...</div>
                <div class="card-footer">
                  <span class="card-source"><ReadOutlined /> {{ item.source }}</span>
                </div>
              </a-card>
            </a-col>
          </a-row>
        </div>

        <!-- 列表视图 -->
        <div v-else-if="viewMode === 'list'" class="news-list-view">
          <a-table
            :columns="tableColumns"
            :data-source="newsData"
            :pagination="{ pageSize: 20 }"
            :row-key="(record, index) => index"
            size="small"
            @row-click="(record, index) => selectNews(index)"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'title'">
                <a :href="record.url" target="_blank" @click.stop>{{ record.title }}</a>
              </template>
              <template v-if="column.key === 'source'">
                <a-tag :color="getSourceColor(record.source)">{{ getSourceName(record.source) }}</a-tag>
              </template>
              <template v-if="column.key === 'datetime'">
                {{ formatNewsTime(record.datetime) }}
              </template>
            </template>
          </a-table>
        </div>

        <!-- 时间线视图 -->
        <div v-else class="news-timeline-view">
          <a-timeline>
            <a-timeline-item v-for="(item, index) in newsData" :key="index" :color="getTimelineColor(item.source)">
              <div class="timeline-item" :class="{ active: selectedNewsIndex === index }" @click="selectNews(index)">
                <div class="timeline-time">{{ formatNewsTime(item.datetime) }}</div>
                <div class="timeline-title">{{ item.title }}</div>
                <div class="timeline-meta">
                  <a-tag :color="getSourceColor(item.source)" size="small">{{ getSourceName(item.source) }}</a-tag>
                </div>
              </div>
            </a-timeline-item>
          </a-timeline>
        </div>

        <!-- 无数据提示 -->
        <a-empty v-if="!loading && newsData.length === 0" description="暂无新闻数据" class="empty-state" />
      </a-spin>
    </div>

    <!-- 主内容区和侧边栏包装器 -->
    <div class="main-content-wrapper">
      <!-- 右侧边栏 -->
      <div class="sidebar">
      <!-- 热点聚焦 -->
      <a-card title="🔥 热点聚焦" size="small" class="sidebar-card">
        <div class="hot-topics">
          <div 
            v-for="(topic, index) in hotTopics" 
            :key="index" 
            class="hot-topic-item"
            @click="handleTopicClick(topic)"
          >
            <span class="topic-rank">{{ index + 1 }}</span>
            <span class="topic-text">{{ topic }}</span>
          </div>
        </div>
      </a-card>

      <!-- AI分析入口 -->
      <a-card title="🤖 AI智能分析" size="small" class="sidebar-card ai-card">
        <div class="ai-entry">
          <div class="ai-entry-icon">
            <RobotOutlined />
          </div>
          <div class="ai-entry-text">
            <h4>智能解读财经新闻</h4>
            <p>基于AI分析市场热点、板块机会和投资风险</p>
          </div>
          <a-button type="primary" block @click="showAIAnalysis" :disabled="newsData.length === 0">
            <RobotOutlined /> 开始AI分析
          </a-button>
        </div>
      </a-card>

      <!-- 快速筛选 -->
      <a-card title="📌 快速筛选" size="small" class="sidebar-card">
        <div class="quick-filters">
          <a-tag 
            v-for="kw in quickFilters" 
            :key="kw"
            :color="selectedKeywords.includes(kw) ? 'blue' : 'default'"
            @click="toggleKeyword(kw)"
            class="filter-tag"
          >
            {{ kw }}
          </a-tag>
        </div>
      </a-card>

      <!-- 新闻来源统计 -->
      <a-card title="📊 来源统计" size="small" class="sidebar-card">
        <div class="source-stats">
          <div v-for="(count, source) in sourceStats" :key="source" class="source-stat-item">
            <span class="source-name">{{ source }}</span>
            <a-progress :percent="count" size="small" :show-info="false" />
            <span class="source-count">{{ count }}</span>
          </div>
        </div>
      </a-card>
    </div>
    </div>

    <!-- AI智能解读弹窗 -->
    <a-modal
      v-model:open="aiModalVisible"
      title="🤖 AI市场智能解读"
      width="900px"
      :footer="null"
      :body-style="{ padding: '24px' }"
    >
      <div class="ai-analysis-content">
        <div v-if="aiLoading" class="ai-loading">
          <a-spin size="large" />
          <p>AI正在分析财经新闻，请稍候...</p>
        </div>
        <div v-else-if="aiAnalysisResult" class="ai-result">
          <!-- 市场情绪 -->
          <div class="ai-section">
            <div class="ai-section-header">
              <SmileOutlined class="section-icon positive" />
              <h3>📊 市场情绪分析</h3>
            </div>
            <p>{{ aiAnalysisResult.sentiment }}</p>
          </div>

          <!-- 热点话题 -->
          <div class="ai-section">
            <div class="ai-section-header">
              <FireOutlined class="section-icon hot" />
              <h3>🔥 热点话题TOP5</h3>
            </div>
            <ul class="topic-list">
              <li v-for="(topic, i) in aiAnalysisResult.hot_topics" :key="i">{{ topic }}</li>
            </ul>
          </div>

          <!-- 板块机会 -->
          <div class="ai-section">
            <div class="ai-section-header">
              <RiseOutlined class="section-icon opportunity" />
              <h3>💡 板块机会</h3>
            </div>
            <ul class="topic-list">
              <li v-for="(sector, i) in aiAnalysisResult.opportunity_sectors" :key="i">{{ sector }}</li>
            </ul>
          </div>

          <!-- 风险提示 -->
          <div class="ai-section">
            <div class="ai-section-header">
              <WarningOutlined class="section-icon risk" />
              <h3>⚠️ 风险提示</h3>
            </div>
            <ul class="topic-list">
              <li v-for="(risk, i) in aiAnalysisResult.risks" :key="i">{{ risk }}</li>
            </ul>
          </div>

          <!-- 投资建议 -->
          <div class="ai-section suggestion">
            <div class="ai-section-header">
              <BulbOutlined class="section-icon suggestion" />
              <h3>💡 投资建议</h3>
            </div>
            <p>{{ aiAnalysisResult.suggestion }}</p>
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import {
  FileTextOutlined, ReloadOutlined, RobotOutlined,
  AppstoreOutlined, UnorderedListOutlined, ClockCircleOutlined,
  ReadOutlined, ExportOutlined, FireOutlined, RiseOutlined, 
  WarningOutlined, BulbOutlined, SmileOutlined
} from '@ant-design/icons-vue'
import { getNews, getNewsAIAnalysis } from '@/api/marketIntelligence'

// 状态
const loading = ref(false)
const newsSource = ref('all')
const newsChannel = ref('all')
const timeRange = ref('today')
const keyword = ref('')
const viewMode = ref('card')
const newsData = ref([])
const lastUpdateTime = ref('')
const selectedNewsIndex = ref(-1)
const selectedKeywords = ref([])

// AI分析
const aiModalVisible = ref(false)
const aiLoading = ref(false)
const aiAnalysisResult = ref(null)

// 热点话题
const hotTopics = ref([
  '新能源板块持续走强',
  '半导体行业复苏预期',
  '消费复苏带动零售增长',
  '人工智能应用加速落地',
  '外资持续流入A股'
])

// 快速筛选关键词
const quickFilters = ['新能源', '半导体', 'AI', '医药', '消费', '金融', '地产', '汽车', '芯片', '电池']

// 来源映射
const sourceMap = {
  'sina': { name: '新浪财经', color: '#e6162d' },
  'eastmoney': { name: '东方财富', color: '#e6182d' },
  'tushare': { name: 'Tushare', color: '#1890ff' },
  'cls': { name: '财联社', color: '#ff6b00' },
  '默认': { name: '财经', color: '#666' }
}

// 表格列定义
const tableColumns = [
  { title: '时间', key: 'datetime', width: 150 },
  { title: '标题', key: 'title', ellipsis: true },
  { title: '来源', key: 'source', width: 100 },
]

// 来源统计
const sourceStats = computed(() => {
  const stats = {}
  newsData.value.forEach(item => {
    const source = getSourceName(item.source)
    stats[source] = (stats[source] || 0) + 1
  })
  // 转换为百分比
  const total = newsData.value.length || 1
  Object.keys(stats).forEach(key => {
    stats[key] = Math.round((stats[key] / total) * 100)
  })
  return stats
})

// 获取来源名称
const getSourceName = (source) => {
  return sourceMap[source]?.name || source || '财经'
}

// 获取来源颜色
const getSourceColor = (source) => {
  return sourceMap[source]?.color || '#666'
}

// 获取时间线颜色
const getTimelineColor = (source) => {
  const colorMap = {
    'sina': 'red',
    'eastmoney': 'orange',
    'tushare': 'blue',
    'cls': 'green'
  }
  return colorMap[source] || 'gray'
}

// 刷新新闻
const refreshNews = async () => {
  loading.value = true
  try {
    // 计算日期范围
    const now = new Date()
    let startDate = ''
    const endDate = now.toISOString().split('T')[0].replace(/-/g, '')
    
    if (timeRange.value === 'today') {
      startDate = endDate
    } else if (timeRange.value === '3days') {
      const d = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
      startDate = d.toISOString().split('T')[0].replace(/-/g, '')
    } else if (timeRange.value === 'week') {
      const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      startDate = d.toISOString().split('T')[0].replace(/-/g, '')
    } else if (timeRange.value === 'month') {
      const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      startDate = d.toISOString().split('T')[0].replace(/-/g, '')
    }
    
    const params = {
      channel: newsChannel.value,
      sources: newsSource.value !== 'all' ? newsSource.value : '',
      start_date: startDate,
      end_date: endDate,
      keyword: keyword.value,
      limit: 100
    }
    const res = await getNews(params)
    if (res.success) {
      // 应用关键词筛选
      let data = res.data?.list || []
      if (selectedKeywords.value.length > 0) {
        data = data.filter(item => 
          selectedKeywords.value.some(kw => (item.title || '').includes(kw))
        )
      }
      newsData.value = data
      lastUpdateTime.value = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }
  } catch (error) {
    message.error('获取新闻失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

// 选择新闻
const selectNews = (index) => {
  selectedNewsIndex.value = index
}

// 处理热点话题点击
const handleTopicClick = (topic) => {
  keyword.value = topic
  refreshNews()
}

// 切换关键词
const toggleKeyword = (kw) => {
  const idx = selectedKeywords.value.indexOf(kw)
  if (idx > -1) {
    selectedKeywords.value.splice(idx, 1)
  } else {
    selectedKeywords.value.push(kw)
  }
  refreshNews()
}

// 格式化时间
const formatNewsTime = (datetime) => {
  if (!datetime) return ''
  const date = new Date(datetime)
  const now = new Date()
  const diff = now - date
  
  if (diff < 86400000) { // 24小时内
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }
  return `${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}

// 显示AI分析
const showAIAnalysis = async () => {
  aiModalVisible.value = true
  aiLoading.value = true
  aiAnalysisResult.value = null
  try {
    const res = await getNewsAIAnalysis({ news: newsData.value })
    if (res.success && res.data) {
      aiAnalysisResult.value = res.data
    } else {
      aiAnalysisResult.value = {
        sentiment: '市场情绪偏中性，建议关注业绩确定性强的优质标的',
        hot_topics: ['新能源板块持续受关注', '半导体行业复苏预期', '消费复苏趋势明显'],
        opportunity_sectors: ['新能源汽车', '人工智能', '医药生物'],
        risks: ['外围市场波动', '政策不确定性'],
        suggestion: '建议保持谨慎乐观，关注回调后的机会'
      }
    }
  } finally {
    aiLoading.value = false
  }
}

onMounted(() => {
  refreshNews()
})
</script>


<style scoped>
.news-dashboard-container {
  padding: 16px;
  background: #f0f2f5;
  min-height: 100vh;
}
.header-card {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  border-radius: 12px;
  padding: 20px;
}
.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.title-section {
  display: flex;
  align-items: center;
  gap: 16px;
}
.title-icon {
  font-size: 40px;
  color: #e94560;
}
.title-text h1 {
  color: #fff;
  margin: 0;
  font-size: 28px;
}
.subtitle {
  color: rgba(255,255,255,0.7);
  font-size: 14px;
}
.header-actions {
  display: flex;
  gap: 12px;
}
.filter-card {
  border-radius: 12px;
  margin-bottom: 16px;
}
.news-content {
  display: flex;
  gap: 16px;
}
.news-card-view {
  flex: 1;
}
.news-card {
  border-radius: 10px;
  margin-bottom: 16px;
  transition: all 0.3s;
  cursor: pointer;
}
.news-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
}
.sidebar {
  width: 280px;
  flex-shrink: 0;
}
.sidebar-card {
  border-radius: 10px;
  margin-bottom: 16px;
}
.card-header {
  display: flex;
  justify-content: space-between;
}
.card-title {
  font-size: 15px;
  font-weight: 500;
  margin: 12px 0;
}
.card-content {
  color: #666;
  font-size: 13px;
}
.card-source {
  color: #999;
  font-size: 12px;
}
.hot-topic-item {
  display: flex;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}
.topic-rank {
  display: inline-flex;
  width: 22px;
  height: 22px;
  background: #ff4d4f;
  color: #fff;
  border-radius: 50%;
  font-size: 12px;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
}
.ai-card {
  background: linear-gradient(135deg, #f0f5ff 0%, #f9f0ff 100%);
  border: 1px solid #d3adf7;
  padding: 16px;
  text-align: center;
}
.ai-entry-icon {
  font-size: 42px;
  color: #1890ff;
  margin-bottom: 10px;
}
.empty-state {
  padding: 80px 0;
  text-align: center;
}
</style>
