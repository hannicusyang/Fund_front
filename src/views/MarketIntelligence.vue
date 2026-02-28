<!-- src/views/MarketIntelligence.vue -->
<template>
  <div class="news-dashboard-container">
    <!-- 顶部标题区 -->
    <a-card :bordered="false" class="header-card">
      <div class="header-content">
        <div class="title-section">
          <div class="title-icon-wrapper">
            <FileTextOutlined class="title-icon" />
          </div>
          <div class="title-text">
            <h1>财经资讯</h1>
            <span class="subtitle">实时热点 · AI解读</span>
          </div>
        </div>
        <div class="header-actions">
          <a-button type="primary" @click="refreshNews" :loading="loading" class="action-btn">
            <ReloadOutlined /> 刷新
          </a-button>
          <a-button @click="showAIAnalysis" :disabled="newsData.length === 0" class="action-btn">
            <RobotOutlined /> AI分析
          </a-button>
        </div>
      </div>
    </a-card>

    <!-- 筛选控制栏 -->
    <a-card :bordered="false" class="filter-card">
      <!-- 筛选条件 -->
      <div class="filter-row">
        <!-- 新闻来源筛选 -->
        <div class="filter-group">
          <span class="filter-label">来源</span>
          <a-select v-model:value="newsSource" style="width: 110px" size="small" @change="refreshNews">
            <a-select-option value="all">全部</a-select-option>
            <a-select-option value="cls">财联社</a-select-option>
            <a-select-option value="eastmoney">东方财富</a-select-option>
            <a-select-option value="sina">新浪财经</a-select-option>
            <a-select-option value="qq">腾讯财经</a-select-option>
            <a-select-option value="hexun">和讯网</a-select-option>
            <a-select-option value="ifeng">凤凰网</a-select-option>
            <a-select-option value="stcn">证券时报</a-select-option>
            <a-select-option value="yicai">第一财经</a-select-option>
            <a-select-option value="wallstreet">华尔街见闻</a-select-option>
            <a-select-option value="iwencai">同花顺</a-select-option>
          </a-select>
        </div>
        
        <!-- 时间筛选 -->
        <div class="filter-group">
          <span class="filter-label">时间</span>
          <a-select v-model:value="timeRange" style="width: 90px" size="small" @change="refreshNews">
            <a-select-option value="today">今天</a-select-option>
            <a-select-option value="3days">3天</a-select-option>
            <a-select-option value="week">一周</a-select-option>
            <a-select-option value="month">一月</a-select-option>
          </a-select>
        </div>
        
        <!-- 关键词搜索 -->
        <div class="filter-group search-group">
          <a-input-search
            v-model:value="keyword"
            placeholder="搜索新闻..."
            style="width: 160px"
            size="small"
            @search="refreshNews"
            allow-clear
          />
        </div>
        
        <!-- 视图切换 + 统计 -->
        <div class="filter-right">
          <div class="filter-stats">
            <span class="stat-item">
              <ClockCircleOutlined /> {{ lastUpdateTime }}
            </span>
            <span class="stat-item">
              <FileTextOutlined /> {{ newsData.length }}条
              <a-tag v-if="selectedKeywords.length > 0" color="blue" style="margin-left:4px">
                筛{{ selectedKeywords.length }}个
              </a-tag>
            </span>
          </div>
          <a-radio-group v-model:value="viewMode" button-style="solid" size="small" class="view-toggle">
            <a-radio-button value="card"><AppstoreOutlined /></a-radio-button>
            <a-radio-button value="list"><UnorderedListOutlined /></a-radio-button>
            <a-radio-button value="timeline"><ClockCircleOutlined /></a-radio-button>
          </a-radio-group>
        </div>
      </div>
    </a-card>

    <!-- 主内容区 -->
    <div class="news-content">
      <!-- 左侧新闻列表 -->
      <div class="news-main">
        <!-- 加载状态 -->
        <a-spin :spinning="loading" class="news-spin">
          
          <!-- 卡片视图 -->
          <div v-if="viewMode === 'card'" class="news-card-view">
            <a-row :gutter="[12, 12]">
              <a-col :xs="24" :sm="12" :md="8" :lg="6" v-for="(item, index) in newsData" :key="index">
                <a-card class="news-card" :class="{ active: selectedNewsIndex === index }" @click="selectNews(index)">
                  <template #title>
                    <div class="card-header">
                      <a-tag :color="getSourceColor(item.source)" size="small">{{ getSourceName(item.source) }}</a-tag>
                      <span class="card-time">{{ formatNewsTime(item.datetime) }}</span>
                    </div>
                  </template>
                  <template #extra>
                    <a-tooltip title="点击查看详情">
                      <a :href="item.url" target="_blank" @click.stop title="查看原文">
                        <ExportOutlined />
                      </a>
                    </a-tooltip>
                  </template>
                  <div class="card-title">{{ item.title }}</div>
                  <div class="card-content" v-if="item.content">{{ ellipsis(item.content, 60) }}</div>
                  <div class="card-footer">
                    <span class="card-source"><ReadOutlined /> {{ item.source }}</span>
                    <span class="card-click-hint"><ExpandOutlined /> 点击详情</span>
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
              :pagination="{ pageSize: 15, showSizeChanger: true, showQuickJumper: true }"
              :row-key="(record, index) => index"
              size="small"
              :scroll="{ x: 600 }"
              @row-click="(record, index) => selectNews(index)"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'title'">
                  <a :href="record.url" target="_blank" @click.stop class="news-title-link">{{ record.title }}</a>
                </template>
                <template v-if="column.key === 'source'">
                  <a-tag :color="getSourceColor(record.source)" size="small">{{ getSourceName(record.source) }}</a-tag>
                </template>
                <template v-if="column.key === 'datetime'">
                  {{ formatNewsTime(record.datetime) }}
                </template>
              </template>
            </a-table>
          </div>

          <!-- 时间线视图 -->
          <div v-else class="news-timeline-view">
            <a-timeline mode="left">
              <a-timeline-item v-for="(item, index) in newsData" :key="index" :color="getTimelineColor(item.source)">
                <div class="timeline-item" :class="{ active: selectedNewsIndex === index }" @click="selectNews(index)">
                  <div class="timeline-time">{{ formatNewsTime(item.datetime) }}</div>
                  <div class="timeline-title">{{ item.title }}</div>
                  <div class="timeline-meta">
                    <a-tag :color="getSourceColor(item.source)" size="small">{{ getSourceName(item.source) }}</a-tag>
                    <a :href="item.url" target="_blank" @click.stop class="timeline-link">
                      <ExportOutlined /> 原文
                    </a>
                  </div>
                </div>
              </a-timeline-item>
            </a-timeline>
          </div>

          <!-- 无数据提示 -->
          <a-empty v-if="!loading && newsData.length === 0" description="暂无新闻数据" class="empty-state" />
        </a-spin>
      </div>

        <!-- 右侧边栏 - PC端显示 -->
        <div class="sidebar desktop-sidebar">
          <!-- 收藏资讯 -->
          <a-card title="⭐ 我的收藏" size="small" class="sidebar-card favorite-card">
            <template #extra>
              <span class="hint-text">{{ favoriteNews.length }}条</span>
            </template>
            <div class="favorites-list" v-if="favoriteNews.length > 0">
              <div 
                v-for="(item, index) in favoriteNews.slice(0, 10)" 
                :key="index" 
                class="favorite-item"
                @click="viewFavoriteDetail(item)"
              >
                <div class="favorite-title">{{ item.title }}</div>
                <div class="favorite-meta">
                  <a-tag :color="getSourceColor(item.source_name || item.source)" size="small">
                    {{ getSourceName(item.source_name || item.source) }}
                  </a-tag>
                  <a-button type="text" size="small" danger @click.stop="removeFavorite(index)">
                    <DeleteOutlined />
                  </a-button>
                </div>
              </div>
              <div v-if="favoriteNews.length > 10" class="favorites-more">
                <a-button type="link" size="small" @click="showAllFavorites">
                  查看全部 {{ favoriteNews.length }} 条收藏...
                </a-button>
              </div>
            </div>
            <div v-else class="empty-favorites">
              <a-empty description="暂无收藏" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
            </div>
          </a-card>

          <!-- 热点聚焦 -->
          <a-card title="🔥 热点聚焦" size="small" class="sidebar-card">
            <template #extra>
              <span class="hint-text">点击切换</span>
            </template>
            <div class="hot-topics-compact">
              <div 
                v-for="(topic, index) in hotTopics.slice(0, 20)" 
                :key="index" 
                class="hot-topic-chip"
                :class="{ active: selectedKeywords.includes(topic.keyword), 'rank-top': topic.rank <= 3 }"
                @click="handleTopicClick(topic.keyword)"
              >
                <span class="chip-rank" :class="{ top: topic.rank <= 3 }">{{ topic.rank }}</span>
                <span class="chip-text">{{ topic.keyword }}</span>
                <span class="chip-count">{{ topic.count }}</span>
              </div>
            </div>
            <div v-if="hotTopics.length === 0" class="empty-topics">
              <a-empty description="暂无热点数据" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
            </div>
          </a-card>

          <!-- AI分析入口 -->
        <a-card class="sidebar-card ai-card">
          <div class="ai-entry">
            <div class="ai-entry-icon">
              <RobotOutlined />
            </div>
            <div class="ai-entry-text">
              <h4>🤖 AI智能解读</h4>
              <p>基于{{ newsData.length }}条{{ selectedKeywords.length > 0 ? '筛选' : '实时' }}新闻</p>
            </div>
            <a-button type="primary" block @click="showAIAnalysis" :disabled="newsData.length === 0">
              立即分析
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
              <span class="source-count">{{ count }}%</span>
            </div>
          </div>
        </a-card>
      </div>
    </div>

    <!-- 移动端边栏按钮 -->
    <div class="mobile-sidebar-toggle" @click="showMobileSidebar = true">
      <MenuOutlined />
    </div>

    <!-- 移动端侧边栏抽屉 -->
    <a-drawer
      v-model:open="showMobileSidebar"
      title="更多功能"
      placement="right"
      :width="280"
      class="mobile-sidebar-drawer"
    >
      <!-- 热点聚焦 -->
      <div class="drawer-section">
        <h4>🔥 热点聚焦 <small style="color:#999;font-weight:normal">(点击筛选)</small></h4>
        <div class="hot-topics-compact">
          <div 
            v-for="(topic, index) in hotTopics.slice(0, 20)" 
            :key="index" 
            class="hot-topic-chip"
            :class="{ active: selectedKeywords.includes(topic.keyword), 'rank-top': topic.rank <= 3 }"
            @click="handleTopicClick(topic.keyword)"
          >
            <span class="chip-rank" :class="{ top: topic.rank <= 3 }">{{ topic.rank }}</span>
            <span class="chip-text">{{ topic.keyword }}</span>
            <span class="chip-count">{{ topic.count }}</span>
          </div>
        </div>
      </div>

      <!-- AI分析 -->
      <div class="drawer-section">
        <div class="ai-entry">
          <div class="ai-entry-icon">
            <RobotOutlined />
          </div>
          <div class="ai-entry-text">
            <h4>🤖 AI智能解读</h4>
            <p class="ai-subtitle">基于{{ newsData.length }}条{{ selectedKeywords.length > 0 ? '筛选' : '实时' }}新闻</p>
          </div>
          <a-button type="primary" block @click="showMobileSidebar = false; showAIAnalysis()">
            立即分析
          </a-button>
        </div>
      </div>

      <!-- 快速筛选 -->
      <div class="drawer-section">
        <h4>📌 快速筛选</h4>
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
      </div>

      <!-- 来源统计 -->
      <div class="drawer-section">
        <h4>📊 来源统计</h4>
        <div class="source-stats">
          <div v-for="(count, source) in sourceStats" :key="source" class="source-stat-item">
            <span class="source-name">{{ source }}</span>
            <a-progress :percent="count" size="small" :show-info="false" />
            <span class="source-count">{{ count }}%</span>
          </div>
        </div>
      </div>
    </a-drawer>

    <!-- AI智能解读弹窗 -->
    <a-modal
      v-model:open="aiModalVisible"
      title="🤖 AI市场智能解读"
      width="90vw"
      :footer="null"
      :body-style="{ padding: '16px' }"
      class="ai-modal"
    >
      <div class="ai-analysis-content">
        <div v-if="aiLoading" class="ai-loading">
          <a-spin size="large" />
          <p>AI正在分析财经新闻...</p>
        </div>
        <div v-else-if="aiAnalysisResult" class="ai-result">
          <!-- 分析摘要 -->
          <div class="ai-section summary-section">
            <div class="summary-text">{{ aiAnalysisResult.summary }}</div>
            <div class="analysis-meta">
              <a-tag>{{ aiAnalysisResult.news_count || newsData.length }}条新闻</a-tag>
              <a-tag v-for="source in (aiAnalysisResult.sources || []).slice(0, 3)" :key="source" color="blue">{{ source }}</a-tag>
            </div>
          </div>

          <!-- 市场情绪 -->
          <div class="ai-section">
            <div class="ai-section-header">
              <SmileOutlined class="section-icon positive" />
              <h3>市场情绪</h3>
              <a-tag v-if="aiAnalysisResult.sentiment_score" color="purple">
                得分: {{ aiAnalysisResult.sentiment_score }}
              </a-tag>
              <a-tag :color="aiAnalysisResult.sentiment === '偏暖' || aiAnalysisResult.sentiment === '乐观' ? 'green' : aiAnalysisResult.sentiment === '偏谨慎' || aiAnalysisResult.sentiment === '悲观' ? 'red' : 'default'">
                {{ aiAnalysisResult.sentiment_emoji }} {{ aiAnalysisResult.sentiment }}
              </a-tag>
            </div>
            <div class="sentiment-bars">
              <div class="sentiment-bar-item">
                <span>正面</span>
                <a-progress :percent="aiAnalysisResult.sentiment_detail?.positive_ratio || 0" status="active" :show-info="false" stroke-color="#52c41a" />
                <span>{{ aiAnalysisResult.sentiment_detail?.positive_ratio || 0 }}%</span>
              </div>
              <div class="sentiment-bar-item">
                <span>负面</span>
                <a-progress :percent="aiAnalysisResult.sentiment_detail?.negative_ratio || 0" status="active" :show-info="false" stroke-color="#ff4d4f" />
                <span>{{ aiAnalysisResult.sentiment_detail?.negative_ratio || 0 }}%</span>
              </div>
            </div>
          </div>

          <!-- 热点话题 -->
          <div class="ai-section">
            <div class="ai-section-header">
              <FireOutlined class="section-icon hot" />
              <h3>热点话题 TOP</h3>
            </div>
            <a-list
              :data-source="(aiAnalysisResult.hot_topics_detail || aiAnalysisResult.hot_topics || []).slice(0, 8)"
              :split="false"
              size="small"
            >
              <template #renderItem="{ item, index }">
                <a-list-item class="hot-topic-list-item">
                  <a-row type="flex" align="middle" style="width: 100%">
                    <a-col flex="30px">
                      <span class="topic-num">{{ index + 1 }}</span>
                    </a-col>
                    <a-col flex="auto">
                      <span class="topic-name">{{ item.topic || item.keyword || item }}</span>
                    </a-col>
                    <a-col flex="auto" style="text-align: right">
                      <span class="topic-heat">🔥 {{ item.heat || '-' }}</span>
                      <span v-if="item.duration" class="topic-duration">{{ item.duration }}</span>
                    </a-col>
                  </a-row>
                </a-list-item>
              </template>
            </a-list>
          </div>

          <!-- 板块机会 -->
          <div class="ai-section">
            <div class="ai-section-header">
              <RiseOutlined class="section-icon opportunity" />
              <h3>板块机会</h3>
            </div>
            <div class="sector-list">
              <div 
                v-for="(sector, i) in (aiAnalysisResult.opportunity_sectors || []).slice(0, 5)" 
                :key="i" 
                class="sector-item"
              >
                <span class="sector-rank">{{ i + 1 }}</span>
                <div class="sector-info">
                  <span class="sector-name">{{ typeof sector === 'object' ? sector.sector : sector }}</span>
                  <span v-if="typeof sector === 'object' && sector.logic" class="sector-logic">{{ sector.logic }}</span>
                  <span v-if="typeof sector === 'object' && sector.leaders" class="sector-leaders">🏆 {{ sector.leaders.join(', ') }}</span>
                </div>
                <a-tag v-if="typeof sector === 'object' && sector.potential" color="green">{{ sector.potential }}</a-tag>
              </div>
            </div>
          </div>

          <!-- 风险提示 -->
          <div class="ai-section risk-section">
            <div class="ai-section-header">
              <WarningOutlined class="section-icon risk" />
              <h3>风险提示</h3>
            </div>
            <ul class="risk-list">
              <li v-for="(risk, i) in (aiAnalysisResult.risks || []).slice(0, 5)" :key="i">
                <a-tag v-if="typeof risk === 'object'" :color="risk.level === '高' ? 'red' : risk.level === '中' ? 'orange' : 'default'">
                  {{ risk.level }}
                </a-tag>
                {{ typeof risk === 'object' ? risk.risk : risk }}
              </li>
            </ul>
          </div>

          <!-- 投资建议 -->
          <div class="ai-section suggestion">
            <div class="ai-section-header">
              <BulbOutlined class="section-icon suggestion" />
              <h3>投资建议</h3>
            </div>
            <p class="suggestion-text">{{ aiAnalysisResult.suggestion }}</p>
          </div>
        </div>
      </div>
    </a-modal>

    <!-- 资讯详情弹窗 -->
    <a-modal
      v-model:open="detailModalVisible"
      :title="currentNewsDetail?.title || '资讯详情'"
      width="700px"
      :footer="null"
      :body-style="{ padding: '20px' }"
      class="news-detail-modal"
    >
      <div class="detail-content" v-if="currentNewsDetail">
        <!-- 资讯元信息 -->
        <div class="detail-meta">
          <a-tag :color="getSourceColor(currentNewsDetail.source)">
            {{ getSourceName(currentNewsDetail.source) }}
          </a-tag>
          <span class="detail-time">
            <ClockCircleOutlined /> {{ currentNewsDetail.datetime }}
          </span>
          <a-tag v-if="currentNewsDetail.category" color="blue">
            {{ currentNewsDetail.category }}
          </a-tag>
        </div>
        
        <!-- 资讯标题 -->
        <h2 class="detail-title">{{ currentNewsDetail.title }}</h2>
        
        <!-- 资讯内容 -->
        <div class="detail-body">
          <p v-if="currentNewsDetail.content">{{ currentNewsDetail.content }}</p>
          <p v-else class="detail-empty">暂无详细内容，请查看原文链接</p>
        </div>
        
        <!-- 操作按钮 -->
        <div class="detail-actions">
          <a-button 
            :type="isFavorite(currentNewsDetail) ? 'primary' : 'default'"
            @click="toggleFavorite(currentNewsDetail)"
          >
            <HeartFilled v-if="isFavorite(currentNewsDetail)" />
            <HeartOutlined v-else />
            {{ isFavorite(currentNewsDetail) ? '已收藏' : '收藏' }}
          </a-button>
          
          <a-button @click="copyLink(currentNewsDetail)">
            <CopyOutlined /> 复制链接
          </a-button>
          
          <a-button type="primary" :href="currentNewsDetail.url" target="_blank">
            <ExportOutlined /> 查看原文
          </a-button>
        </div>
        
        <!-- 底部信息 -->
        <div class="detail-footer">
          <span>来源: {{ currentNewsDetail.source }}</span>
          <span>ID: {{ currentNewsDetail.id }}</span>
        </div>
      </div>
    </a-modal>

    <!-- 全部收藏弹窗 -->
    <a-modal
      v-model:open="allFavoritesModalVisible"
      title="⭐ 我的收藏"
      width="800px"
      :footer="null"
      :body-style="{ padding: '16px' }"
    >
      <div class="all-favorites-list" v-if="favoriteNews.length > 0">
        <div 
          v-for="(item, index) in favoriteNews" 
          :key="index" 
          class="favorite-detail-item"
        >
          <div class="favorite-detail-title" @click="viewFavoriteDetail(item)">
            {{ item.title }}
          </div>
          <div class="favorite-detail-meta">
            <a-tag :color="getSourceColor(item.source_name || item.source)">
              {{ getSourceName(item.source_name || item.source) }}
            </a-tag>
            <span class="detail-time">{{ item.datetime }}</span>
            <a-button type="text" danger size="small" @click="removeFavorite(index)">
              <DeleteOutlined /> 删除
            </a-button>
            <a-button type="primary" size="small" :href="item.url" target="_blank">
              <ExportOutlined /> 查看原文
            </a-button>
          </div>
        </div>
      </div>
      <a-empty v-else description="暂无收藏" />
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { message, Empty } from 'ant-design-vue'
import {
  FileTextOutlined, ReloadOutlined, RobotOutlined,
  AppstoreOutlined, UnorderedListOutlined, ClockCircleOutlined,
  ReadOutlined, ExportOutlined, FireOutlined, RiseOutlined, 
  WarningOutlined, BulbOutlined, SmileOutlined,
  FilterOutlined, DownOutlined, MenuOutlined,
  HeartOutlined, HeartFilled, ShareAltOutlined, CopyOutlined,
  ExpandOutlined, StarOutlined, StarFilled, CheckCircleOutlined,
  DeleteOutlined
} from '@ant-design/icons-vue'
import { getNews, getNewsAIAnalysis } from '@/api/marketIntelligence'
import request from '@/utils/axios'

// 响应式状态
const showMobileFilter = ref(false)
const showMobileSidebar = ref(false)

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

// 资讯详情弹窗
const detailModalVisible = ref(false)
const currentNewsDetail = ref(null)

// 收藏的资讯
const favoriteNews = ref([])

// 热点话题 - 动态获取
const hotTopics = ref([])

// 快速筛选关键词 - 动态获取
const quickFilters = ref([])

// 分类筛选 - 动态获取
const newsCategories = ref([])

// 来源映射
const sourceMap = {
  'sina': { name: '新浪', color: '#e6162d' },
  'eastmoney': { name: '东财', color: '#e6182d' },
  'cls': { name: '财联社', color: '#ff6b00' },
  'qq': { name: '腾讯', color: '#12b7f5' },
  'hexun': { name: '和讯', color: '#e6162d' },
  'ifeng': { name: '凤凰', color: '#ffa500' },
  'stcn': { name: '证券时报', color: '#0066cc' },
  'yicai': { name: '第一财经', color: '#e6182d' },
  'bloomberg': { name: '彭博社', color: '#000000' },
  'wallstreet': { name: '华尔街见闻', color: '#ff6600' },
  'iwencai': { name: '同花顺', color: '#ff6600' },
  '默认': { name: '财经', color: '#666' }
}

// 表格列定义
const tableColumns = [
  { title: '时间', key: 'datetime', width: 100 },
  { title: '标题', key: 'title', ellipsis: true },
  { title: '来源', key: 'source', width: 70 },
]

// 来源统计
const sourceStats = computed(() => {
  const stats = {}
  newsData.value.forEach(item => {
    const source = getSourceName(item.source)
    stats[source] = (stats[source] || 0) + 1
  })
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

// 文本截断
const ellipsis = (text, length) => {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}

// 刷新新闻 - 同时清空后端缓存
const refreshNews = async () => {
  loading.value = true
  try {
    // 先尝试清空后端缓存
    try {
      await request.post('/market/intelligence/news/refresh')
    } catch (e) {
      // 忽略缓存清空错误
    }
    
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
      limit: 500  // 显示更多新闻
    }
    const res = await getNews(params)
    if (res.success) {
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

// 选择新闻 - 打开详情弹窗
const selectNews = (index) => {
  selectedNewsIndex.value = index
  currentNewsDetail.value = newsData.value[index]
  detailModalVisible.value = true
}

// 检查是否已收藏
const isFavorite = (news) => {
  return favoriteNews.value.some(f => f.id === news.id || f.title === news.title)
}

// 切换收藏状态
const toggleFavorite = (news) => {
  const idx = favoriteNews.value.findIndex(f => f.id === news.id || f.title === news.title)
  if (idx > -1) {
    favoriteNews.value.splice(idx, 1)
    message.success('已取消收藏')
  } else {
    favoriteNews.value.push(news)
    message.success('已添加到收藏')
  }
}

// 复制链接
const copyLink = (news) => {
  if (news.url) {
    navigator.clipboard.writeText(news.url)
    message.success('链接已复制到剪贴板')
  }
}

// 查看收藏详情
const viewFavoriteDetail = (item) => {
  currentNewsDetail.value = item
  detailModalVisible.value = true
}

// 移除收藏
const removeFavorite = (index) => {
  favoriteNews.value.splice(index, 1)
  message.success('已移除收藏')
}

// 显示全部收藏弹窗
const allFavoritesModalVisible = ref(false)
const showAllFavorites = () => {
  allFavoritesModalVisible.value = true
}

// 处理热点话题点击 - 切换筛选状态（单击切换）
const handleTopicClick = async (topic) => {
  const idx = selectedKeywords.value.indexOf(topic)
  if (idx > -1) {
    // 已选中，取消筛选
    selectedKeywords.value.splice(idx, 1)
    message.info(`已取消: ${topic}`)
    
    // 如果没有其他关键词了，清空搜索
    if (selectedKeywords.value.length === 0) {
      keyword.value = ''
    }
  } else {
    // 未选中，添加筛选
    selectedKeywords.value.push(topic)
    keyword.value = topic
    message.success(`已添加: ${topic}`)
  }
  
  await refreshNews()
  
  // 如果AI分析窗口是打开的，自动更新分析结果
  if (aiModalVisible.value && newsData.value.length > 0) {
    await showAIAnalysis()
  }
}

// 切换关键词（快速筛选标签）
const toggleKeyword = async (kw) => {
  const idx = selectedKeywords.value.indexOf(kw)
  if (idx > -1) {
    selectedKeywords.value.splice(idx, 1)
    message.info(`已取消: ${kw}`)
    
    // 如果没有其他关键词了，清空搜索
    if (selectedKeywords.value.length === 0) {
      keyword.value = ''
    }
  } else {
    selectedKeywords.value.push(kw)
    keyword.value = kw
    message.success(`已添加: ${kw}`)
  }
  
  await refreshNews()
  
  // 如果AI分析窗口是打开的，自动更新分析结果
  if (aiModalVisible.value && newsData.value.length > 0) {
    await showAIAnalysis()
  }
}

// 格式化时间
const formatNewsTime = (datetime) => {
  if (!datetime) return ''
  const date = new Date(datetime)
  const now = new Date()
  const diff = now - date
  
  if (diff < 86400000) {
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
        hot_topics: hotTopics.value.length > 0 ? hotTopics.value : ['新能源板块持续受关注', '半导体行业复苏预期'],
        opportunity_sectors: ['新能源汽车', '人工智能', '医药生物'],
        risks: ['外围市场波动', '政策不确定性'],
        suggestion: '建议保持谨慎乐观，关注回调后的机会'
      }
    }
  } finally {
    aiLoading.value = false
  }
}

// 获取动态热点话题
const fetchHotTopics = async () => {
  try {
    const res = await request.get('/market/intelligence/news/hot-topics', { params: { limit: 10 } })
    if (res.success && res.data && res.data.length > 0) {
      hotTopics.value = res.data
    }
  } catch (e) {
    console.warn('获取热点话题失败:', e)
  }
}

// 获取动态筛选关键词
const fetchDynamicFilters = async () => {
  try {
    const res = await request.get('/market/intelligence/news/filters')
    if (res.success && res.data) {
      quickFilters.value = res.data.keywords || []
      newsCategories.value = res.data.categories || []
    }
  } catch (e) {
    console.warn('获取筛选关键词失败:', e)
  }
}

onMounted(() => {
  refreshNews()
  fetchHotTopics()
  fetchDynamicFilters()
})
</script>

<style scoped>
.news-dashboard-container {
  padding: 12px;
  background: #f0f2f5;
  min-height: 100vh;
}

/* 头部卡片 */
.header-card {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  border-radius: 12px;
  margin-bottom: 12px;
}
.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
.title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}
.title-icon-wrapper {
  width: 44px;
  height: 44px;
  background: rgba(255,255,255,0.1);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.title-icon {
  font-size: 24px;
  color: #e94560;
}
.title-text h1 {
  color: #fff;
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}
.subtitle {
  color: rgba(255,255,255,0.7);
  font-size: 12px;
}
.header-actions {
  display: flex;
  gap: 8px;
}
.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 筛选卡片 */
.filter-card {
  border-radius: 12px;
  margin-bottom: 12px;
}
.mobile-filter-toggle {
  display: none;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 8px;
  cursor: pointer;
  color: #666;
}
.mobile-filter-toggle .anticon-down {
  transition: transform 0.3s;
}
.mobile-filter-toggle .rotated {
  transform: rotate(180deg);
}
.filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
.filter-row.hidden {
  display: none;
}
.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.filter-label {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
}
.search-group {
  flex: 1;
  min-width: 140px;
}
.search-group :deep(.ant-input-search) {
  width: 100% !important;
}
.filter-right {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}
.filter-stats {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #999;
}
.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}
.view-toggle {
  flex-shrink: 0;
}

/* 主内容区 */
.news-content {
  display: flex;
  gap: 12px;
}
.news-main {
  flex: 1;
  min-width: 0;
}

/* 卡片视图 */
.news-card-view {
  width: 100%;
}
.news-card {
  border-radius: 10px;
  transition: all 0.3s;
  cursor: pointer;
  height: 100%;
}
.news-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  border-color: #1890ff;
}
.news-card.active {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24,144,255,0.2);
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-time {
  font-size: 12px;
  color: #999;
}
.card-title {
  font-size: 14px;
  font-weight: 500;
  margin: 8px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-content {
  color: #666;
  font-size: 12px;
  line-height: 1.5;
}
.card-footer {
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-source {
  color: #999;
  font-size: 11px;
}
.card-click-hint {
  color: #1890ff;
  font-size: 11px;
  opacity: 0;
  transition: opacity 0.3s;
}
.news-card:hover .card-click-hint {
  opacity: 1;
}

/* 列表视图 */
.news-title-link {
  color: #333;
}
.news-title-link:hover {
  color: #1890ff;
}

/* 时间线视图 */
.news-timeline-view {
  padding: 12px 0;
}
.timeline-item {
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: background 0.3s;
}
.timeline-item:hover {
  background: #f5f5f5;
}
.timeline-item.active {
  background: #e6f7ff;
}
.timeline-time {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}
.timeline-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 6px;
  line-height: 1.4;
}
.timeline-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
.timeline-link {
  font-size: 12px;
  color: #1890ff;
}

/* 侧边栏 */
.sidebar {
  width: 260px;
  flex-shrink: 0;
}
.desktop-sidebar {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.sidebar-card {
  border-radius: 10px;
}

/* 热点话题紧凑版 */
.hot-topics-compact {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.hot-topic-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: #f5f5f5;
  border: 1px solid #e8e8e8;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
}
.hot-topic-chip:hover {
  background: #e6f7ff;
  border-color: #91d5ff;
  transform: scale(1.02);
}
.hot-topic-chip.active {
  background: #e6f7ff;
  border-color: #1890ff;
}
.hot-topic-chip.active .chip-text {
  color: #1890ff;
}
.hot-topic-chip.rank-top {
  background: linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%);
  border-color: #ffbb96;
}
.chip-rank {
  display: inline-flex;
  width: 18px;
  height: 18px;
  background: #e0e0e0;
  color: #666;
  border-radius: 50%;
  font-size: 10px;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-weight: 600;
}
.chip-rank.top {
  background: #ff4d4f;
  color: #fff;
}
.chip-text {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chip-count {
  font-size: 10px;
  color: #999;
  background: rgba(255,255,255,0.5);
  padding: 1px 5px;
  border-radius: 10px;
}
.hot-topic-chip.active .chip-count {
  background: rgba(255,255,255,0.3);
  color: #fff;
}

/* AI卡片 */
.ai-card {
  background: linear-gradient(135deg, #f0f5ff 0%, #f9f0ff 100%);
  border: 1px solid #d3adf7;
}
.ai-entry {
  text-align: center;
}
.ai-entry-icon {
  font-size: 36px;
  color: #1890ff;
  margin-bottom: 8px;
}
.ai-entry-text h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
}
.ai-entry-text p {
  margin: 0;
  font-size: 12px;
  color: #666;
}

/* 快速筛选 */
.quick-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.filter-tag {
  cursor: pointer;
  transition: all 0.3s;
}
.filter-tag:hover {
  transform: scale(1.05);
}

/* 来源统计 */
.source-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.source-stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.source-name {
  font-size: 12px;
  width: 40px;
  flex-shrink: 0;
}
.source-count {
  font-size: 11px;
  color: #999;
  width: 30px;
  text-align: right;
}

/* 空状态 */
.empty-state {
  padding: 60px 0;
}

/* 移动端边栏按钮 */
.mobile-sidebar-toggle {
  display: none;
  position: fixed;
  right: 16px;
  bottom: 24px;
  width: 48px;
  height: 48px;
  background: #1890ff;
  color: #fff;
  border-radius: 50%;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  box-shadow: 0 4px 12px rgba(24,144,255,0.4);
  cursor: pointer;
  z-index: 100;
}

/* 移动端抽屉区块 */
.drawer-section {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}
.drawer-section:last-child {
  border-bottom: none;
}
.drawer-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #333;
}

/* AI弹窗 */
.ai-analysis-content {
  max-height: 60vh;
  overflow-y: auto;
}
.ai-loading {
  text-align: center;
  padding: 40px 0;
}
.ai-loading p {
  margin-top: 16px;
  color: #666;
}
.ai-section {
  margin-bottom: 16px;
}
.ai-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.ai-section-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}
.section-icon {
  font-size: 18px;
}
.section-icon.positive { color: #52c41a; }
.section-icon.hot { color: #ff4d4f; }
.section-icon.opportunity { color: #1890ff; }
.section-icon.risk { color: #faad14; }
.section-icon.suggestion { color: #722ed1; }
.topic-list {
  margin: 0;
  padding-left: 20px;
}
.topic-list li {
  margin-bottom: 4px;
  font-size: 13px;
  color: #666;
}

/* 热点话题列表 */
.hot-topic-list-item {
  padding: 8px 0 !important;
}
.topic-num {
  display: inline-flex;
  width: 22px;
  height: 22px;
  background: #f0f0f0;
  color: #666;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  align-items: center;
  justify-content: center;
}
.topic-name {
  font-size: 14px;
  color: #333;
  margin-left: 8px;
}
.topic-heat {
  font-size: 13px;
  color: #ff4d4f;
  font-weight: 500;
  margin-left: 12px;
}
.topic-duration {
  font-size: 12px;
  color: #1890ff;
  background: #e6f7ff;
  padding: 2px 8px;
  border-radius: 4px;
  margin-left: 8px;
}

/* 板块列表 */
.sector-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sector-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sector-rank {
  width: 20px;
  height: 20px;
  background: #1890ff;
  color: #fff;
  border-radius: 50%;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sector-name {
  flex: 1;
  font-size: 13px;
}

/* 风险列表 */
.risk-list {
  margin: 0;
  padding-left: 16px;
}
.risk-list li {
  margin-bottom: 6px;
  font-size: 13px;
  color: #666;
  line-height: 1.5;
}

/* 投资建议 */
.suggestion-text {
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;
  border-left: 3px solid #722ed1;
}

/* 分析摘要 */
.summary-section {
  padding: 12px;
  background: linear-gradient(135deg, #e6f7ff 0%, #f9f0ff 100%);
  border-radius: 8px;
  margin-bottom: 16px;
}
.summary-text {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
}
.analysis-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

/* 情感进度条 */
.sentiment-bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sentiment-bar-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.sentiment-bar-item span:first-child {
  width: 30px;
  color: #666;
}
.sentiment-bar-item span:last-child {
  width: 40px;
  text-align: right;
  color: #999;
}

/* 空状态 */
.empty-topics {
  padding: 20px 0;
}

/* AI副标题 */
.ai-subtitle {
  font-size: 12px;
  color: #999;
  margin: 4px 0 0 0;
}

/* 热点数量标签 */
.topic-count {
  font-size: 11px;
  color: #999;
  margin-left: auto;
  padding-left: 8px;
}

/* 提示文本 */
.hint-text {
  font-size: 12px;
  color: #999;
}

/* ====== 响应式布局 ====== */
@media (max-width: 992px) {
  .sidebar {
    width: 220px;
  }
}

@media (max-width: 768px) {
  .news-dashboard-container {
    padding: 8px;
  }
  
  .header-content {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }
  
  .mobile-filter-toggle {
    display: flex;
  }
  
  .filter-row {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .filter-group {
    width: 100%;
  }
  
  .filter-group :deep(.ant-radio-group) {
    flex-wrap: wrap;
  }
  
  .search-group {
    width: 100%;
  }
  
  .search-group :deep(.ant-input-search) {
    width: 100% !important;
  }
  
  .filter-right {
    width: 100%;
    margin-left: 0;
    justify-content: space-between;
  }
  
  .filter-stats {
    display: none;
  }
  
  /* 隐藏桌面端侧边栏 */
  .desktop-sidebar {
    display: none;
  }
  
  /* 显示移动端边栏按钮 */
  .mobile-sidebar-toggle {
    display: flex;
  }
  
  /* 调整卡片间距 */
  :deep(.ant-col) {
    margin-bottom: 0 !important;
  }
  
  /* 列表视图优化 */
  .news-list-view :deep(.ant-table) {
    font-size: 12px;
  }
  
  /* 时间线视图优化 */
  .news-timeline-view {
    padding: 8px;
  }
  .timeline-title {
    font-size: 13px;
  }
}

@media (max-width: 576px) {
  .title-text h1 {
    font-size: 18px;
  }
  
  .header-actions {
    flex-wrap: wrap;
  }
  
  .action-btn {
    font-size: 12px;
    padding: 4px 8px;
  }
  
  .action-btn :deep(.anticon) {
    font-size: 12px;
  }
  
  /* 更小的筛选按钮 */
  .filter-group :deep(.ant-radio-button-wrapper) {
    padding: 0 8px;
    font-size: 12px;
  }
  
  /* 移动端抽屉 */
  .mobile-sidebar-drawer :deep(.ant-drawer-body) {
    padding: 16px;
  }
}

/* 资讯详情弹窗样式 */
.detail-content {
  max-height: 70vh;
  overflow-y: auto;
}

.detail-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.detail-time {
  color: #999;
  font-size: 13px;
}

.detail-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 16px 0;
  line-height: 1.5;
  color: #333;
}

.detail-body {
  background: #f9f9f9;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  min-height: 100px;
}

.detail-body p {
  margin: 0;
  line-height: 1.8;
  color: #666;
  font-size: 14px;
}

.detail-empty {
  color: #999;
  font-style: italic;
}

.detail-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.detail-footer {
  display: flex;
  justify-content: space-between;
  color: #999;
  font-size: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

/* 收藏按钮激活状态 */
.detail-actions .ant-btn-primary .anticon {
  color: #fff;
}

/* 收藏列表样式 */
.favorite-card {
  margin-bottom: 12px;
}

.favorites-list {
  max-height: 300px;
  overflow-y: auto;
}

.favorite-item {
  padding: 8px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.2s;
}

.favorite-item:hover {
  background: #f5f5f5;
}

.favorite-item:last-child {
  border-bottom: none;
}

.favorite-title {
  font-size: 13px;
  color: #333;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 4px;
}

.favorite-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.favorites-more {
  text-align: center;
  padding: 8px 0;
  border-top: 1px solid #f0f0f0;
}

.empty-favorites {
  padding: 20px 0;
}

.hint-text {
  font-size: 11px;
  color: #999;
}

/* 全部收藏弹窗样式 */
.all-favorites-list {
  max-height: 60vh;
  overflow-y: auto;
}

.favorite-detail-item {
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.favorite-detail-item:last-child {
  border-bottom: none;
}

.favorite-detail-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
  cursor: pointer;
  line-height: 1.5;
}

.favorite-detail-title:hover {
  color: #1890ff;
}

.favorite-detail-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.detail-time {
  color: #999;
  font-size: 12px;
}
</style>
