<template>
  <div class="fund-analysis">
    <a-row :gutter="16">
      <!-- 基金选择 -->
      <a-col :span="24">
        <a-card class="selection-card">
          <div class="selection-header">
            <span class="label">选择对比基金：</span>
            <a-select
              v-model:value="selectedFundCodes"
              mode="multiple"
              style="width: 500px"
              placeholder="请选择要分析的基金"
              :max-tag-count="5"
            >
              <a-select-option 
                v-for="fund in fundPool" 
                :key="fund.fund_code"
                :value="fund.fund_code"
              >
                {{ fund.fund_name }} ({{ fund.fund_code }})
              </a-select-option>
            </a-select>
            <a-space style="margin-left: 16px">
              <a-button @click="selectAll">全选</a-button>
              <a-button @click="clearSelection">清空</a-button>
            </a-space>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 收益走势对比 -->
    <a-row :gutter="16" style="margin-top: 16px">
      <a-col :span="24">
        <a-card title="收益走势对比" class="chart-card">
          <template #extra>
            <a-space>
              <span class="label">基准指数：</span>
              <a-select
                v-model:value="selectedBenchmarks"
                mode="multiple"
                style="width: 200px"
                placeholder="选择基准"
                :max-tag-count="2"
              >
                <a-select-option 
                  v-for="bm in benchmarkList" 
                  :key="bm.code"
                  :value="bm.code"
                >
                  {{ bm.name }}
                </a-select-option>
              </a-select>
              <a-divider type="vertical" />
              <a-radio-group v-model:value="timeRange" @change="handleTimeRangeChange">
                <a-radio-button value="1m">近1月</a-radio-button>
                <a-radio-button value="3m">近3月</a-radio-button>
                <a-radio-button value="6m">近6月</a-radio-button>
                <a-radio-button value="1y">近1年</a-radio-button>
                <a-radio-button value="3y">近3年</a-radio-button>
                <a-radio-button value="5y">近5年</a-radio-button>
                <a-radio-button value="all">全部</a-radio-button>
                <a-radio-button value="custom">自定义</a-radio-button>
              </a-radio-group>
              <a-range-picker
                v-if="timeRange === 'custom'"
                v-model:value="customDateRange"
                @change="handleCustomDateChange"
              />
              <a-button type="primary" @click="loadTrendData" :loading="trendLoading">
                <ReloadOutlined /> 刷新
              </a-button>
            </a-space>
          </template>
          <div ref="trendChartRef" class="chart" style="height: 400px;"></div>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16" style="margin-top: 16px">
      <!-- 基金指标对比表 -->
      <a-col :span="24">
        <a-card class="metrics-card">
          <template #title>
            <div class="metrics-title">
              <span>基金量化指标对比</span>
              <a-radio-group v-model:value="metricsViewMode" size="small" style="margin-left: 16px">
                <a-radio-button value="basic">基础指标</a-radio-button>
                <a-radio-button value="professional">专业指标</a-radio-button>
              </a-radio-group>
            </div>
          </template>
          <template #extra>
            <a-space v-if="metricsViewMode === 'professional'">
              <span>基准：</span>
              <a-select v-model:value="metricsBenchmark" style="width: 120px" size="small">
                <a-select-option v-for="bm in benchmarkList" :key="bm.code" :value="bm.code">
                  {{ bm.name }}
                </a-select-option>
              </a-select>
              <span>周期：</span>
              <a-select v-model:value="metricsPeriod" style="width: 80px" size="small" @change="loadProfessionalMetrics">
                <a-select-option value="1y">1年</a-select-option>
                <a-select-option value="2y">2年</a-select-option>
                <a-select-option value="3y">3年</a-select-option>
              </a-select>
              <a-button size="small" @click="loadProfessionalMetrics" :loading="professionalMetricsLoading">
                <ReloadOutlined /> 刷新
              </a-button>
            </a-space>
          </template>
          
          <!-- 基础指标表格 -->
          <a-table
            v-if="metricsViewMode === 'basic'"
            :data-source="selectedFundsWithMetrics"
            :columns="metricsColumns"
            :pagination="false"
            size="small"
            bordered
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'fund_name'">
                <div class="fund-cell">
                  <div class="name">{{ record.fund_name }}</div>
                  <div class="code">{{ record.fund_code }}</div>
                </div>
              </template>

              <template v-else-if="column.dataIndex?.includes('growth_rate')">
                <span :class="getRateClass(record[column.dataIndex])">
                  {{ formatRate(record[column.dataIndex]) }}
                </span>
              </template>

              <template v-else-if="column.dataIndex === 'sharpe'">
                <span :class="getSharpeClass(record[column.dataIndex])">
                  {{ formatNumber(record[column.dataIndex]) }}
                </span>
              </template>

              <template v-else-if="column.dataIndex === 'rank'">
                <a-tag :color="getRankColor(record[column.dataIndex])">
                  {{ record[column.dataIndex] }}
                </a-tag>
              </template>
            </template>
          </a-table>

          <!-- 专业指标表格 -->
          <a-table
            v-else
            :data-source="professionalMetricsData"
            :columns="professionalMetricsColumns"
            :pagination="false"
            :loading="professionalMetricsLoading"
            size="small"
            bordered
            :scroll="{ x: 1600 }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'fund_name'">
                <div class="fund-cell">
                  <div class="name">{{ record.fund_name }}</div>
                  <div class="code">{{ record.fund_code }}</div>
                </div>
              </template>

              <template v-else-if="column.key === 'morningstar_rating'">
                <span class="star-rating">
                  {{ '★'.repeat(record.morningstar_rating) }}{{ '☆'.repeat(5 - record.morningstar_rating) }}
                </span>
              </template>

              <template v-else-if="column.dataIndex === 'annual_return' || column.dataIndex === 'alpha'">
                <span :class="getRateClass(record[column.dataIndex])">
                  {{ formatRate(record[column.dataIndex]) }}
                </span>
              </template>

              <template v-else-if="column.dataIndex === 'max_drawdown'">
                <span class="text-down">-{{ formatNumber(record[column.dataIndex]) }}%</span>
              </template>

              <template v-else-if="column.dataIndex === 'sharpe_ratio' || column.dataIndex === 'sortino_ratio' || column.dataIndex === 'calmar_ratio'">
                <span :class="getSharpeClass(record[column.dataIndex])">
                  {{ formatNumber(record[column.dataIndex]) }}
                </span>
              </template>

              <template v-else-if="column.dataIndex === 'win_rate'">
                <a-progress 
                  :percent="record[column.dataIndex]" 
                  :stroke-color="record[column.dataIndex] >= 50 ? '#52c41a' : '#faad14'"
                  size="small"
                  style="width: 80px"
                />
              </template>

              <template v-else-if="column.dataIndex === 'beta'">
                <a-tag :color="record[column.dataIndex] > 1.2 ? 'red' : record[column.dataIndex] < 0.8 ? 'blue' : 'default'">
                  {{ formatNumber(record[column.dataIndex]) }}
                </a-tag>
              </template>

              <!-- 其他数值字段统一处理 -->
              <template v-else-if="column.dataIndex">
                {{ formatNumber(record[column.dataIndex]) }}
              </template>
            </template>
          </a-table>

          <!-- 基准信息 -->
          <div v-if="metricsViewMode === 'professional' && benchmarkInfo" class="benchmark-info">
            <a-divider />
            <a-descriptions size="small" :column="4">
              <a-descriptions-item label="基准指数">{{ benchmarkInfo.name }}</a-descriptions-item>
              <a-descriptions-item label="基准年化收益">
                <span :class="getRateClass(benchmarkInfo.annual_return)">
                  {{ formatRate(benchmarkInfo.annual_return) }}
                </span>
              </a-descriptions-item>
              <a-descriptions-item label="基准波动率">{{ formatNumber(benchmarkInfo.volatility) }}%</a-descriptions-item>
              <a-descriptions-item label="无风险利率">{{ riskFreeRate }}%</a-descriptions-item>
            </a-descriptions>
            <!-- 数据来源提示 -->
            <div v-if="!benchmarkInfo.data_source" class="benchmark-warning">
              <a-tag color="orange">⚠️ 基准数据暂不可用</a-tag>
              <span class="warning-text">相关指标（Alpha、Beta、信息比率等）无法计算</span>
            </div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16" style="margin-top: 16px">
      <!-- 风险收益散点图 -->
      <a-col :xs="24" :lg="12">
        <a-card title="风险收益分布" class="chart-card risk-return-card">
          <template #extra>
            <a-space>
              <a-radio-group v-model:value="riskPeriod" @change="handleRiskPeriodChange" size="small">
                <a-radio-button value="1m">1月</a-radio-button>
                <a-radio-button value="3m">3月</a-radio-button>
                <a-radio-button value="6m">6月</a-radio-button>
                <a-radio-button value="1y">1年</a-radio-button>
                <a-radio-button value="2y">2年</a-radio-button>
                <a-radio-button value="3y">3年</a-radio-button>
              </a-radio-group>
              <a-radio-group v-model:value="volatilityPeriod" @change="handleRiskPeriodChange" size="small">
                <a-radio-button value="1m">短波</a-radio-button>
                <a-radio-button value="3m">中波</a-radio-button>
                <a-radio-button value="1y">长波</a-radio-button>
              </a-radio-group>
            </a-space>
          </template>
          <div v-if="selectedFundCodes.length === 0" class="chart-placeholder">
            <a-empty description="请先选择基金" />
          </div>
          <div v-else ref="riskReturnChartRef" class="chart"></div>
        </a-card>
      </a-col>

      <!-- 相关性热力图 -->
      <a-col :xs="24" :lg="12">
        <a-card 
          title="基金相关性分析" 
          class="chart-card"
          :loading="correlationLoading"
        >
          <div v-if="showCorrelationEmpty" class="chart-placeholder">
            <a-empty description="请选择至少2只基金进行分析" />
          </div>
          <div v-show="!showCorrelationEmpty" ref="correlationChartRef" class="chart"></div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 智能分析报告 - 优化版 -->
    <a-row style="margin-top: 16px">
      <a-col :span="24">
        <a-card class="analysis-report-card">
          <template #title>
            <div class="report-title">
              <span>📊 智能分析报告</span>
              <a-tag v-if="selectedFundCodes.length > 0" :color="healthGrade.color">
                {{ healthGrade.label }}
              </a-tag>
            </div>
          </template>
          <template #extra>
            <a-button type="link" @click="refreshAnalysis" :loading="analysisLoading">
              <ReloadOutlined /> 刷新分析
            </a-button>
          </template>

          <!-- 空状态 -->
          <div v-if="selectedFundCodes.length === 0" class="empty-analysis">
            <a-empty description="请先选择基金进行分析" />
          </div>

          <template v-else>
            <!-- 第一行：健康度仪表盘 + 组合雷达图 -->
            <a-row :gutter="16">
              <a-col :xs="24" :lg="8">
                <div class="health-dashboard">
                  <div class="health-score-container">
                    <div ref="healthGaugeRef" class="health-gauge"></div>
                    <div class="health-details">
                      <div class="detail-item">
                        <span class="label">收益能力</span>
                        <a-progress 
                          :percent="healthMetrics.returnScore" 
                          :stroke-color="getScoreColor(healthMetrics.returnScore)"
                          :show-info="false"
                          size="small"
                        />
                      </div>
                      <div class="detail-item">
                        <span class="label">风险控制</span>
                        <a-progress 
                          :percent="healthMetrics.riskScore" 
                          :stroke-color="getScoreColor(healthMetrics.riskScore)"
                          :show-info="false"
                          size="small"
                        />
                      </div>
                      <div class="detail-item">
                        <span class="label">分散程度</span>
                        <a-progress 
                          :percent="healthMetrics.diversificationScore" 
                          :stroke-color="getScoreColor(healthMetrics.diversificationScore)"
                          :show-info="false"
                          size="small"
                        />
                      </div>
                      <div class="detail-item">
                        <span class="label">成长动能</span>
                        <a-progress 
                          :percent="healthMetrics.momentumScore" 
                          :stroke-color="getScoreColor(healthMetrics.momentumScore)"
                          :show-info="false"
                          size="small"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </a-col>
              
              <a-col :xs="24" :lg="16">
                <div ref="radarChartRef" class="radar-chart"></div>
              </a-col>
            </a-row>

            <!-- 第二行：核心指标卡片 -->
            <a-row :gutter="16" style="margin-top: 16px">
              <a-col :xs="12" :sm="6">
                <div class="metric-card best-return">
                  <div class="metric-icon">🏆</div>
                  <div class="metric-content">
                    <div class="metric-label">收益冠军</div>
                    <div class="metric-value">{{ analysisResult.bestReturn?.fund_name?.substring(0, 8) || '--' }}</div>
                    <div class="metric-detail" :class="getRateClass(analysisResult.bestReturn?.yearly_1_growth_rate)">
                      {{ formatRate(analysisResult.bestReturn?.yearly_1_growth_rate) }}
                    </div>
                  </div>
                </div>
              </a-col>
              <a-col :xs="12" :sm="6">
                <div class="metric-card best-sharpe">
                  <div class="metric-icon">⚖️</div>
                  <div class="metric-content">
                    <div class="metric-label">风险调整最优</div>
                    <div class="metric-value">{{ analysisResult.bestSharpe?.fund_name?.substring(0, 8) || '--' }}</div>
                    <div class="metric-detail">
                      夏普 {{ formatNumber(analysisResult.bestSharpe?.sharpe) }}
                    </div>
                  </div>
                </div>
              </a-col>
              <a-col :xs="12" :sm="6">
                <div class="metric-card lowest-risk">
                  <div class="metric-icon">🛡️</div>
                  <div class="metric-content">
                    <div class="metric-label">最稳健</div>
                    <div class="metric-value">{{ analysisResult.lowestVolatility?.fund_name?.substring(0, 8) || '--' }}</div>
                    <div class="metric-detail">
                      波动率 {{ formatNumber(analysisResult.lowestVolatility?.volatility) }}%
                    </div>
                  </div>
                </div>
              </a-col>
              <a-col :xs="12" :sm="6">
                <div class="metric-card best-momentum">
                  <div class="metric-icon">🚀</div>
                  <div class="metric-content">
                    <div class="metric-label">近期最强</div>
                    <div class="metric-value">{{ analysisResult.highestGrowth?.fund_name?.substring(0, 8) || '--' }}</div>
                    <div class="metric-detail" :class="getRateClass(analysisResult.highestGrowth?.monthly_3_growth_rate)">
                      3月 {{ formatRate(analysisResult.highestGrowth?.monthly_3_growth_rate) }}
                    </div>
                  </div>
                </div>
              </a-col>
            </a-row>

            <!-- 第三行：基金排名对比表 -->
            <div class="ranking-section" style="margin-top: 20px">
              <div class="section-title">
                <span>📈 多维度排名对比</span>
                <a-tooltip title="基于年化收益、夏普比率、波动率、近期动能等维度综合排名">
                  <InfoCircleOutlined style="margin-left: 8px; color: #8c8c8c" />
                </a-tooltip>
              </div>
              <a-table
                :data-source="fundRankings"
                :columns="rankingColumns"
                :pagination="false"
                size="small"
                bordered
                class="ranking-table"
              >
                <template #bodyCell="{ column, record, index }">
                  <template v-if="column.key === 'rank'">
                    <a-badge 
                      :count="index + 1" 
                      :number-style="{ 
                        backgroundColor: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#8c8c8c',
                        fontWeight: 'bold'
                      }"
                    />
                  </template>
                  <template v-else-if="column.key === 'fund_name'">
                    <div class="fund-name-cell">
                      <span class="name">{{ record.fund_name }}</span>
                      <span class="code">{{ record.fund_code }}</span>
                    </div>
                  </template>
                  <template v-else-if="column.key === 'returnRank'">
                    <a-tag :color="getRankTagColor(record.returnRank, fundRankings.length)">
                      #{{ record.returnRank }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'sharpeRank'">
                    <a-tag :color="getRankTagColor(record.sharpeRank, fundRankings.length)">
                      #{{ record.sharpeRank }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'volatilityRank'">
                    <a-tag :color="getRankTagColor(record.volatilityRank, fundRankings.length)">
                      #{{ record.volatilityRank }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'momentumRank'">
                    <a-tag :color="getRankTagColor(record.momentumRank, fundRankings.length)">
                      #{{ record.momentumRank }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'overallScore'">
                    <div class="score-cell">
                      <a-progress 
                        :percent="record.overallScore" 
                        :stroke-color="getScoreGradient(record.overallScore)"
                        :format="() => record.overallScore.toFixed(0)"
                        size="small"
                        style="width: 80px"
                      />
                    </div>
                  </template>
                  <template v-else-if="column.key === 'recommendation'">
                    <a-tag :color="record.recommendation.color">
                      {{ record.recommendation.text }}
                    </a-tag>
                  </template>
                </template>
              </a-table>
            </div>

            <!-- 第四行：智能投资建议 -->
            <div class="recommendations-section" style="margin-top: 20px">
              <div class="section-title">💡 智能投资建议</div>
              <a-row :gutter="16">
                <!-- 核心建议 -->
                <a-col :xs="24" :lg="12">
                  <div class="recommendation-group core-recommendations">
                    <div class="group-title">
                      <span class="icon">🎯</span>
                      <span>核心建议</span>
                    </div>
                    <div class="recommendation-list">
                      <div 
                        v-for="(rec, idx) in coreRecommendations" 
                        :key="idx"
                        class="recommendation-item"
                        :class="rec.type"
                      >
                        <div class="rec-icon">{{ rec.icon }}</div>
                        <div class="rec-content">
                          <div class="rec-title">{{ rec.title }}</div>
                          <div class="rec-desc">{{ rec.description }}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </a-col>
                
                <!-- 风险提示 -->
                <a-col :xs="24" :lg="12">
                  <div class="recommendation-group risk-alerts">
                    <div class="group-title">
                      <span class="icon">⚠️</span>
                      <span>风险提示</span>
                    </div>
                    <div class="recommendation-list">
                      <div 
                        v-for="(alert, idx) in riskAlerts" 
                        :key="idx"
                        class="recommendation-item"
                        :class="alert.level"
                      >
                        <div class="rec-icon">{{ alert.icon }}</div>
                        <div class="rec-content">
                          <div class="rec-title">{{ alert.title }}</div>
                          <div class="rec-desc">{{ alert.description }}</div>
                        </div>
                      </div>
                      <div v-if="riskAlerts.length === 0" class="no-alerts">
                        <CheckCircleOutlined style="color: #52c41a; font-size: 24px" />
                        <span>暂无重大风险提示</span>
                      </div>
                    </div>
                  </div>
                </a-col>
              </a-row>
            </div>

            <!-- 第五行：组合优化建议 -->
            <div class="optimization-section" style="margin-top: 20px">
              <div class="section-title">🔧 组合优化建议</div>
              <a-row :gutter="16">
                <a-col 
                  v-for="(opt, idx) in optimizationSuggestions" 
                  :key="idx"
                  :xs="24" 
                  :sm="12" 
                  :lg="8"
                >
                  <div class="optimization-card" :class="opt.priority">
                    <div class="opt-header">
                      <span class="opt-icon">{{ opt.icon }}</span>
                      <span class="opt-title">{{ opt.title }}</span>
                      <a-tag :color="opt.priorityColor" size="small">{{ opt.priorityLabel }}</a-tag>
                    </div>
                    <div class="opt-content">{{ opt.content }}</div>
                    <div class="opt-action" v-if="opt.action">
                      <a-button type="link" size="small">{{ opt.action }}</a-button>
                    </div>
                  </div>
                </a-col>
              </a-row>
            </div>
          </template>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { message } from 'ant-design-vue'
import { ReloadOutlined, InfoCircleOutlined, CheckCircleOutlined } from '@ant-design/icons-vue'
import { fundAnalysisApi, benchmarkApi } from '@/api/fundModel.js'
import dayjs from 'dayjs'

const props = defineProps({
  fundPool: {
    type: Array,
    default: () => []
  }
})

// 选中的基金代码
const selectedFundCodes = ref([])

// 基准指数相关
const benchmarkList = ref([
  { code: '000300', name: '沪深300' },
  { code: '000905', name: '中证500' },
  { code: '000001', name: '上证指数' },
  { code: '399006', name: '创业板指' }
])
const selectedBenchmarks = ref(['000300'])  // 默认选中沪深300
const benchmarkData = ref({})

// 时间范围
const timeRange = ref('1y')
const customDateRange = ref(null)
const trendLoading = ref(false)

// 风险收益分析参数
const riskPeriod = ref('1y')  // 收益率时间维度
const volatilityPeriod = ref('1y')  // 波动率时间维度

// 收益走势数据
const trendData = ref({})

// 专业指标相关
const metricsViewMode = ref('basic')  // basic | professional
const metricsBenchmark = ref('000300')
const metricsPeriod = ref('1y')
const professionalMetricsData = ref([])
const professionalMetricsLoading = ref(false)
const benchmarkInfo = ref(null)
const riskFreeRate = ref(2.5)

// 风险收益数据
const riskReturnData = ref({ funds: [], selected_avg: {}, market_avg: {} })

// 指标列定义
const metricsColumns = [
  {
    title: '基金',
    key: 'fund_name',
    width: 200,
    fixed: 'left'
  },
  {
    title: '排名',
    dataIndex: 'rank',
    key: 'rank',
    width: 80,
    align: 'center'
  },
  {
    title: '最新净值',
    dataIndex: 'net_value',
    width: 100,
    align: 'right'
  },
  {
    title: '日涨幅',
    dataIndex: 'daily_growth_rate',
    width: 90,
    align: 'right'
  },
  {
    title: '周涨幅',
    dataIndex: 'weekly_growth_rate',
    width: 90,
    align: 'right'
  },
  {
    title: '月涨幅',
    dataIndex: 'monthly_1_growth_rate',
    width: 90,
    align: 'right'
  },
  {
    title: '3月涨幅',
    dataIndex: 'monthly_3_growth_rate',
    width: 90,
    align: 'right'
  },
  {
    title: '6月涨幅',
    dataIndex: 'monthly_6_growth_rate',
    width: 90,
    align: 'right'
  },
  {
    title: '年度收益',
    dataIndex: 'yearly_1_growth_rate',
    width: 100,
    align: 'right'
  },
  {
    title: '夏普比率',
    dataIndex: 'sharpe',
    width: 100,
    align: 'right'
  }
]

// 专业指标列定义 - 修改 customRender 处理 null 值
const professionalMetricsColumns = [
  { title: '基金', key: 'fund_name', width: 180, fixed: 'left' },
  { title: '评级', key: 'morningstar_rating', width: 100, align: 'center' },
  { 
    title: '年化收益', 
    dataIndex: 'annual_return', 
    width: 100, 
    align: 'right',
    customRender: ({ text }) => formatRate(text)
  },
  { 
    title: '年化波动', 
    dataIndex: 'volatility', 
    width: 90, 
    align: 'right',
    customRender: ({ text }) => text != null ? `${formatNumber(text)}%` : '--'
  },
  { 
    title: '最大回撤', 
    dataIndex: 'max_drawdown', 
    width: 90, 
    align: 'right',
    customRender: ({ text }) => text != null ? `-${formatNumber(text)}%` : '--'
  },
  { 
    title: '夏普比率', 
    dataIndex: 'sharpe_ratio', 
    width: 90, 
    align: 'right',
    customRender: ({ text }) => formatNumber(text)
  },
  { 
    title: '索提诺', 
    dataIndex: 'sortino_ratio', 
    width: 80, 
    align: 'right',
    customRender: ({ text }) => formatNumber(text)
  },
  { 
    title: '卡玛比率', 
    dataIndex: 'calmar_ratio', 
    width: 90, 
    align: 'right',
    customRender: ({ text }) => formatNumber(text)
  },
  { 
    title: 'Alpha', 
    dataIndex: 'alpha', 
    width: 80, 
    align: 'right',
    customRender: ({ text }) => formatRate(text)
  },
  { 
    title: 'Beta', 
    dataIndex: 'beta', 
    width: 70, 
    align: 'center',
    customRender: ({ text }) => formatNumber(text)
  },
  { 
    title: '信息比率', 
    dataIndex: 'information_ratio', 
    width: 90, 
    align: 'right',
    customRender: ({ text }) => formatNumber(text)
  },
  { 
    title: '胜率', 
    dataIndex: 'win_rate', 
    width: 100, 
    align: 'center',
    customRender: ({ text }) => text != null ? `${formatNumber(text)}%` : '--'
  },
  { 
    title: '盈亏比', 
    dataIndex: 'profit_loss_ratio', 
    width: 80, 
    align: 'right',
    customRender: ({ text }) => formatNumber(text)
  }
]

// 选中的基金及其指标
const selectedFundsWithMetrics = computed(() => {
  return props.fundPool.filter(fund => 
    selectedFundCodes.value.includes(fund.fund_code)
  )
})

// 计算日期范围
function getDateRange() {
  const endDate = dayjs().format('YYYY-MM-DD')
  let startDate

  switch (timeRange.value) {
    case '1m':
      startDate = dayjs().subtract(1, 'month').format('YYYY-MM-DD')
      break
    case '3m':
      startDate = dayjs().subtract(3, 'month').format('YYYY-MM-DD')
      break
    case '6m':
      startDate = dayjs().subtract(6, 'month').format('YYYY-MM-DD')
      break
    case '1y':
      startDate = dayjs().subtract(1, 'year').format('YYYY-MM-DD')
      break
    case '3y':
      startDate = dayjs().subtract(3, 'year').format('YYYY-MM-DD')
      break
    case '5y':
      startDate = dayjs().subtract(5, 'year').format('YYYY-MM-DD')
      break
    case 'all':
      startDate = '2000-01-01'
      break
    case 'custom':
      if (customDateRange.value && customDateRange.value.length === 2) {
        return {
          startDate: customDateRange.value[0].format('YYYY-MM-DD'),
          endDate: customDateRange.value[1].format('YYYY-MM-DD')
        }
      }
      startDate = dayjs().subtract(1, 'year').format('YYYY-MM-DD')
      break
    default:
      startDate = dayjs().subtract(1, 'year').format('YYYY-MM-DD')
  }

  return { startDate, endDate }
}

// 加载收益走势数据
async function loadTrendData() {
  if (selectedFundCodes.value.length === 0) {
    message.warning('请先选择基金')
    return
  }

  trendLoading.value = true
  try {
    const { startDate, endDate } = getDateRange()
    
    // 并行加载基金数据和基准指数数据
    const [fundResponse, benchmarkResponse] = await Promise.all([
      fundAnalysisApi.getReturnsAnalysis(selectedFundCodes.value, startDate, endDate),
      selectedBenchmarks.value.length > 0 
        ? benchmarkApi.getBenchmarkHistory(selectedBenchmarks.value, startDate, endDate)
        : Promise.resolve({ success: true, data: {} })
    ])

    if (fundResponse.success) {
      trendData.value = fundResponse.data
    }
    
    if (benchmarkResponse.success) {
      benchmarkData.value = benchmarkResponse.data
    }
    
    initTrendChart()
  } catch (error) {
    console.error('加载收益走势数据失败:', error)
    message.error('加载数据失败')
  } finally {
    trendLoading.value = false
  }
}

// 加载专业指标数据
async function loadProfessionalMetrics() {
  if (selectedFundCodes.value.length === 0) {
    professionalMetricsData.value = []
    benchmarkInfo.value = null
    return
  }

  professionalMetricsLoading.value = true
  try {
    const response = await fundAnalysisApi.calculateProfessionalMetrics(
      selectedFundCodes.value,
      metricsBenchmark.value,
      metricsPeriod.value
    )

    if (response.success) {
      professionalMetricsData.value = response.data.funds
      benchmarkInfo.value = response.data.benchmark
      riskFreeRate.value = response.data.risk_free_rate
    } else {
      message.warning(response.message || '计算专业指标失败')
      professionalMetricsData.value = []
      benchmarkInfo.value = null
    }
  } catch (error) {
    console.error('加载专业指标失败:', error)
    message.error('加载专业指标失败')
    professionalMetricsData.value = []
    benchmarkInfo.value = null
  } finally {
    professionalMetricsLoading.value = false
  }
}

// 加载风险收益数据
async function loadRiskReturnData() {
  if (selectedFundCodes.value.length === 0) {
    riskReturnData.value = { funds: [], selected_avg: {}, market_avg: {} }
    nextTick(() => {
      initRiskReturnChart()
    })
    return
  }

  try {
    const response = await fundAnalysisApi.calculateRiskReturn(
      selectedFundCodes.value,
      volatilityPeriod.value
    )

    if (response.success) {
      riskReturnData.value = response.data
      initRiskReturnChart()
    } else {
      message.warning(response.message || '计算风险收益数据失败')
    }
  } catch (error) {
    console.error('加载风险收益数据失败:', error)
  }
}

// 时间范围变化
function handleTimeRangeChange() {
  if (timeRange.value !== 'custom') {
    loadTrendData()
  }
}

// 自定义日期变化
function handleCustomDateChange() {
  if (customDateRange.value && customDateRange.value.length === 2) {
    loadTrendData()
  }
}

// 风险收益周期变化
function handleRiskPeriodChange() {
  loadRiskReturnData()
}

// 分析结果 - 增强版
const analysisResult = computed(() => {
  const funds = selectedFundsWithMetrics.value
  const riskData = riskReturnData.value.funds || []
  
  if (funds.length === 0) return {}

  // 合并基金数据和风险数据
  const mergedFunds = funds.map(fund => {
    const riskInfo = riskData.find(r => r.code === fund.fund_code) || {}
    return {
      ...fund,
      volatility: riskInfo.volatilities?.[volatilityPeriod.value] || null,
      sharpe: riskInfo.sharpe_ratios?.[volatilityPeriod.value] || parseFloat(fund.sharpe || 0)
    }
  })

  // 计算综合评分（基于多个维度）
  const scoredFunds = mergedFunds.map(fund => {
    const returnScore = parseFloat(fund.yearly_1_growth_rate || 0) || 0
    const sharpeScore = parseFloat(fund.sharpe || 0) || 0
    const rankScore = 1000 - (parseInt(fund.rank) || 0)
    const monthly3Score = parseFloat(fund.monthly_3_growth_rate || 0) || 0
    const monthly6Score = parseFloat(fund.monthly_6_growth_rate || 0) || 0
    
    const overallScore = returnScore * 0.3 + sharpeScore * 0.25 + rankScore * 0.2 + 
                         monthly3Score * 0.15 + monthly6Score * 0.1
    
    return { ...fund, overallScore }
  })

  return {
    bestReturn: mergedFunds.reduce((max, fund) => 
      parseFloat(fund.yearly_1_growth_rate || 0) > parseFloat(max.yearly_1_growth_rate || 0) ? fund : max
    , mergedFunds[0]),
    
    lowestVolatility: mergedFunds.filter(f => f.volatility != null).length > 0
      ? mergedFunds.filter(f => f.volatility != null).reduce((min, fund) => 
          (fund.volatility || 999) < (min.volatility || 999) ? fund : min
        , mergedFunds.filter(f => f.volatility != null)[0])
      : mergedFunds[0],
    
    bestSharpe: mergedFunds.reduce((max, fund) => 
      parseFloat(fund.sharpe || 0) > parseFloat(max.sharpe || 0) ? fund : max
    , mergedFunds[0]),

    topOverall: scoredFunds.reduce((top, fund) => 
      fund.overallScore > top.overallScore ? fund : top
    , scoredFunds[0]),
    
    highestGrowth: mergedFunds.reduce((best, fund) => {
      const currentGrowth = (parseFloat(fund.monthly_3_growth_rate || 0) + 
                            parseFloat(fund.monthly_6_growth_rate || 0)) / 2
      const bestGrowth = (parseFloat(best.monthly_3_growth_rate || 0) + 
                         parseFloat(best.monthly_6_growth_rate || 0)) / 2
      return currentGrowth > bestGrowth ? fund : best
    }, mergedFunds[0]),
    
    // 所有合并后的基金数据
    allFunds: mergedFunds,
    scoredFunds
  }
})

// 投资建议
const recommendations = computed(() => {
  const recs = []
  const funds = selectedFundsWithMetrics.value
  
  if (funds.length === 0) return recs

  // 计算各种指标
  const avgReturn = funds.reduce((sum, f) => sum + parseFloat(f.yearly_1_growth_rate || 0), 0) / funds.length
  const avgSharpe = funds.reduce((sum, f) => sum + parseFloat(f.sharpe || 0), 0) / funds.length
  const avgMonthly3 = funds.reduce((sum, f) => sum + parseFloat(f.monthly_3_growth_rate || 0), 0) / funds.length
  const avgMonthly6 = funds.reduce((sum, f) => sum + parseFloat(f.monthly_6_growth_rate || 0), 0) / funds.length
  
  // 计算波动率（通过夏普比率反推）
  const avgVolatility = avgReturn / (avgSharpe || 1) // 避免除零

  // 综合健康度评分
  const healthScore = (
    (avgReturn > 0 ? 25 : 0) +
    (avgSharpe > 0.5 ? 20 : avgSharpe > 0 ? 10 : 0) +
    (funds.length >= 3 ? 15 : 5) +
    (avgVolatility < 20 ? 20 : avgVolatility < 30 ? 10 : 0) +
    (avgMonthly3 > 5 ? 10 : 0) +
    (avgMonthly6 > 10 ? 10 : 0)
  )
  
  // 健康度评估
  let healthLevel = ''
  let healthColor = ''
  if (healthScore >= 70) {
    healthLevel = '优秀'
    healthColor = '#52c41a'
  } else if (healthScore >= 50) {
    healthLevel = '良好'
    healthColor = '#1890ff'
  } else if (healthScore >= 30) {
    healthLevel = '一般'
    healthColor = '#faad14'
  } else {
    healthLevel = '需关注'
    healthColor = '#f5222d'
  }
  
  recs.push({
    title: `投资组合健康度: ${healthLevel}`,
    description: `基于收益、风险、分散度等多维度评估，当前组合健康度评分为${healthScore}分。`,
    icon: healthScore >= 70 ? '🌟' : healthScore >= 50 ? '👍' : healthScore >= 30 ? '😐' : '⚠️',
    color: healthColor
  })

  // 高收益分析
  if (avgReturn > 30) {
    recs.push({
      title: '高收益潜力',
      description: '所选基金平均年化收益超过30%，具有较强的增长潜力，但需注意波动风险。',
      icon: '🚀',
      color: '#ff4d4f'
    })
  } else if (avgReturn > 15) {
    recs.push({
      title: '稳健收益',
      description: `所选基金平均年化收益${avgReturn.toFixed(2)}%，属于稳健增长水平，风险适中。`,
      icon: '📈',
      color: '#52c41a'
    })
  } else if (avgReturn < 0) {
    recs.push({
      title: '风险提示',
      description: '所选基金近期表现不佳，平均收益为负，建议谨慎持有或重新评估。',
      icon: '📉',
      color: '#faad14'
    })
  }

  // 夏普比率分析
  if (avgSharpe > 1.5) {
    recs.push({
      title: '风险调整优异',
      description: `平均夏普比率${avgSharpe.toFixed(2)}，表明风险调整后收益较好。`,
      icon: '⚖️',
      color: '#1890ff'
    })
  } else if (avgSharpe > 0.5) {
    recs.push({
      title: '风险收益比良好',
      description: `平均夏普比率${avgSharpe.toFixed(2)}，风险收益比较为合理。`,
      icon: '✅',
      color: '#52c41a'
    })
  } else if (avgSharpe < 0.5 && avgSharpe > 0) {
    recs.push({
      title: '风险收益比待提升',
      description: `平均夏普比率${avgSharpe.toFixed(2)}，风险收益比较低，建议关注性价比更高的基金。`,
      icon: '⚠️',
      color: '#faad14'
    })
  } else if (avgSharpe <= 0) {
    recs.push({
      title: '风险收益比需改善',
      description: `平均夏普比率为${avgSharpe.toFixed(2)}，收益无法覆盖风险，建议重新评估。`,
      icon: '🚨',
      color: '#f5222d'
    })
  }

  // 组合分析
  if (funds.length >= 5) {
    recs.push({
      title: '充分分散化',
      description: `已选择${funds.length}只基金，分散化程度较高，有效降低非系统性风险。`,
      icon: '🛡️',
      color: '#52c41a'
    })
  } else if (funds.length >= 3) {
    recs.push({
      title: '适度分散化',
      description: `已选择${funds.length}只基金，有助于分散投资风险，建议持续监控相关性变化。`,
      icon: '🧩',
      color: '#1890ff'
    })
  } else if (funds.length === 2) {
    recs.push({
      title: '组合构建初期',
      description: '选择2只基金开始构建组合，建议逐步增加至3-5只基金以更好分散风险。',
      icon: '🏗️',
      color: '#1890ff'
    })
  } else if (funds.length === 1) {
    recs.push({
      title: '单一资产风险',
      description: '仅选择1只基金，集中度较高，建议适当分散投资以降低非系统性风险。',
      icon: '⚠️',
      color: '#faad14'
    })
  }

  // 短期趋势分析
  if (avgMonthly3 > 10) {
    recs.push({
      title: '短期强势',
      description: `近3个月平均收益${avgMonthly3.toFixed(2)}%，表现强势，可继续关注。`,
      icon: '🔥',
      color: '#ff4d4f'
    })
  } else if (avgMonthly3 < -5) {
    recs.push({
      title: '短期回调',
      description: `近3个月平均收益${avgMonthly3.toFixed(2)}%，出现回调，建议观察后续表现。`,
      icon: '❄️',
      color: '#1890ff'
    })
  }

  if (avgMonthly6 > 15) {
    recs.push({
      title: '中期表现优异',
      description: `近6个月平均收益${avgMonthly6.toFixed(2)}%，中期表现稳健，具备持续增长能力。`,
      icon: '🏆',
      color: '#ffd666'
    })
  }

  // 波动率分析
  if (avgVolatility > 30) {
    recs.push({
      title: '极高波动性',
      description: '所选基金波动极大，适合高风险承受能力的投资者，建议降低仓位。',
      icon: '🌪️',
      color: '#f5222d'
    })
  } else if (avgVolatility > 20) {
    recs.push({
      title: '高波动性',
      description: '所选基金波动较大，适合风险承受能力较高的投资者。',
      icon: '💨',
      color: '#faad14'
    })
  } else if (avgVolatility < 10) {
    recs.push({
      title: '稳定性较好',
      description: '所选基金波动较小，适合追求稳定收益的投资者。',
      icon: '🎯',
      color: '#52c41a'
    })
  }

  // 个性化建议
  const topPerformers = funds.filter(f => parseFloat(f.yearly_1_growth_rate || 0) > avgReturn * 1.2)
  const underperformers = funds.filter(f => parseFloat(f.yearly_1_growth_rate || 0) < avgReturn * 0.8)
  
  if (topPerformers.length > 0) {
    recs.push({
      title: `(${topPerformers.length})只明星基金`,
      description: `${topPerformers.length}只基金表现突出，优于组合平均收益20%以上，可重点关注。`,
      icon: '⭐',
      color: '#ffd666'
    })
  }
  
  if (underperformers.length > 0) {
    recs.push({
      title: `(${underperformers.length})只关注基金`,
      description: `${underperformers.length}只基金表现低于组合平均20%，建议持续跟踪或考虑调整。`,
      icon: '🔍',
      color: '#ffa940'
    })
  }

  // 集中度分析
  const top3Funds = [...funds].sort((a, b) => 
    parseFloat(b.yearly_1_growth_rate || 0) - parseFloat(a.yearly_1_growth_rate || 0)
  ).slice(0, 3)
  
  const top3Concentration = top3Funds.reduce((sum, f) => sum + Math.abs(parseFloat(f.yearly_1_growth_rate || 0)), 0) / 
                           funds.reduce((sum, f) => sum + Math.abs(parseFloat(f.yearly_1_growth_rate || 0)), 0)
  
  if (top3Concentration > 0.6) {
    recs.push({
      title: '收益集中度较高',
      description: `前3只基金贡献了${(top3Concentration * 100).toFixed(0)}%的收益，建议关注收益来源多样化。`,
      icon: '📊',
      color: '#faad14'
    })
  }

  return recs
})

// 健康度评分指标（使用专业指标数据增强）
const healthMetrics = computed(() => {
  const funds = selectedFundsWithMetrics.value
  const riskData = riskReturnData.value.funds || []
  const proMetrics = professionalMetricsData.value || []
  
  if (funds.length === 0) {
    return { returnScore: 0, riskScore: 0, diversificationScore: 0, momentumScore: 0, total: 0 }
  }

  // 收益能力评分 (0-100)
  // 优先使用专业指标的年化收益
  let avgReturn
  if (proMetrics.length > 0) {
    avgReturn = proMetrics.reduce((sum, f) => sum + (f.annual_return || 0), 0) / proMetrics.length
  } else {
    avgReturn = funds.reduce((sum, f) => sum + parseFloat(f.yearly_1_growth_rate || 0), 0) / funds.length
  }
  const returnScore = Math.min(100, Math.max(0, 50 + avgReturn * 1.5))

  // 风险控制评分 (基于夏普比率和最大回撤)
  let riskScore
  if (proMetrics.length > 0) {
    const avgSharpe = proMetrics.reduce((sum, f) => sum + (f.sharpe_ratio || 0), 0) / proMetrics.length
    const avgDrawdown = proMetrics.reduce((sum, f) => sum + (f.max_drawdown || 0), 0) / proMetrics.length
    // 夏普比率贡献60%，最大回撤贡献40%
    const sharpeScore = Math.min(100, Math.max(0, 50 + avgSharpe * 25))
    const drawdownScore = Math.min(100, Math.max(0, 100 - avgDrawdown * 2))
    riskScore = sharpeScore * 0.6 + drawdownScore * 0.4
  } else {
    const avgSharpe = riskData.length > 0 
      ? riskData.reduce((sum, f) => sum + (f.sharpe_ratios?.[volatilityPeriod.value] || 0), 0) / riskData.length
      : funds.reduce((sum, f) => sum + parseFloat(f.sharpe || 0), 0) / funds.length
    riskScore = Math.min(100, Math.max(0, 50 + avgSharpe * 25))
  }

  // 分散程度评分（考虑相关性）
  let diversificationScore = 0
  if (funds.length >= 5) diversificationScore = 90
  else if (funds.length >= 3) diversificationScore = 70
  else if (funds.length >= 2) diversificationScore = 50
  else diversificationScore = 30
  
  // 如果有相关性数据，根据平均相关性调整
  const corrMatrix = correlationData.value.matrix || []
  if (corrMatrix.length > 0) {
    let totalCorr = 0
    let count = 0
    for (let i = 0; i < corrMatrix.length; i++) {
      for (let j = i + 1; j < corrMatrix[i].length; j++) {
        totalCorr += Math.abs(parseFloat(corrMatrix[i][j]))
        count++
      }
    }
    if (count > 0) {
      const avgCorr = totalCorr / count
      // 相关性越低，分散效果越好
      diversificationScore = diversificationScore * (1.2 - avgCorr * 0.4)
      diversificationScore = Math.min(100, Math.max(0, diversificationScore))
    }
  }

  // 成长动能评分
  const avgMomentum = funds.reduce((sum, f) => {
    const m3 = parseFloat(f.monthly_3_growth_rate || 0)
    const m1 = parseFloat(f.monthly_1_growth_rate || 0)
    return sum + (m3 + m1) / 2
  }, 0) / funds.length
  const momentumScore = Math.min(100, Math.max(0, 50 + avgMomentum * 2))

  // 总分（参考晨星评级权重）
  const total = Math.round((returnScore * 0.30 + riskScore * 0.35 + diversificationScore * 0.15 + momentumScore * 0.20))

  return { 
    returnScore: Math.round(returnScore), 
    riskScore: Math.round(riskScore), 
    diversificationScore: Math.round(diversificationScore), 
    momentumScore: Math.round(momentumScore), 
    total 
  }
})

// 健康度等级
const healthGrade = computed(() => {
  const score = healthMetrics.value.total
  if (score >= 80) return { label: '优秀', color: '#52c41a', level: 'excellent' }
  if (score >= 60) return { label: '良好', color: '#1890ff', level: 'good' }
  if (score >= 40) return { label: '一般', color: '#faad14', level: 'average' }
  return { label: '需关注', color: '#f5222d', level: 'poor' }
})

// 基金排名数据
const fundRankings = computed(() => {
  const funds = selectedFundsWithMetrics.value
  const riskData = riskReturnData.value.funds || []
  
  if (funds.length === 0) return []

  // 合并基金数据和风险数据
  const mergedFunds = funds.map(fund => {
    const riskInfo = riskData.find(r => r.code === fund.fund_code) || {}
    return {
      ...fund,
      volatility: riskInfo.volatilities?.[volatilityPeriod.value] || null,
      calculatedSharpe: riskInfo.sharpe_ratios?.[volatilityPeriod.value] || parseFloat(fund.sharpe || 0)
    }
  })

  // 计算各维度排名
  const returnSorted = [...mergedFunds].sort((a, b) => 
    parseFloat(b.yearly_1_growth_rate || 0) - parseFloat(a.yearly_1_growth_rate || 0))
  const sharpeSorted = [...mergedFunds].sort((a, b) => 
    (b.calculatedSharpe || 0) - (a.calculatedSharpe || 0))
  const volatilitySorted = [...mergedFunds].sort((a, b) => 
    (a.volatility || 999) - (b.volatility || 999))
  const momentumSorted = [...mergedFunds].sort((a, b) => {
    const aM = (parseFloat(a.monthly_3_growth_rate || 0) + parseFloat(a.monthly_1_growth_rate || 0)) / 2
    const bM = (parseFloat(b.monthly_3_growth_rate || 0) + parseFloat(b.monthly_1_growth_rate || 0)) / 2
    return bM - aM
  })

  const n = mergedFunds.length
  return mergedFunds.map(fund => {
    const returnRank = returnSorted.findIndex(f => f.fund_code === fund.fund_code) + 1
    const sharpeRank = sharpeSorted.findIndex(f => f.fund_code === fund.fund_code) + 1
    const volatilityRank = volatilitySorted.findIndex(f => f.fund_code === fund.fund_code) + 1
    const momentumRank = momentumSorted.findIndex(f => f.fund_code === fund.fund_code) + 1
    
    // 综合评分 (排名越小越好，转换为分数)
    const overallScore = Math.round(
      ((n - returnRank + 1) / n * 35 +
       (n - sharpeRank + 1) / n * 30 +
       (n - volatilityRank + 1) / n * 20 +
       (n - momentumRank + 1) / n * 15) * 100 / 100
    )

    // 推荐标签
    let recommendation = { text: '持有观察', color: 'default' }
    if (overallScore >= 80) recommendation = { text: '强烈推荐', color: 'green' }
    else if (overallScore >= 60) recommendation = { text: '推荐', color: 'blue' }
    else if (overallScore >= 40) recommendation = { text: '持有观察', color: 'orange' }
    else recommendation = { text: '建议减持', color: 'red' }

    return {
      ...fund,
      returnRank,
      sharpeRank,
      volatilityRank,
      momentumRank,
      overallScore,
      recommendation
    }
  }).sort((a, b) => b.overallScore - a.overallScore)
})

// 排名表格列定义
const rankingColumns = [
  { title: '排名', key: 'rank', width: 60, align: 'center' },
  { title: '基金', key: 'fund_name', width: 180 },
  { title: '收益排名', key: 'returnRank', width: 90, align: 'center' },
  { title: '夏普排名', key: 'sharpeRank', width: 90, align: 'center' },
  { title: '稳定排名', key: 'volatilityRank', width: 90, align: 'center' },
  { title: '动能排名', key: 'momentumRank', width: 90, align: 'center' },
  { title: '综合评分', key: 'overallScore', width: 120, align: 'center' },
  { title: '建议', key: 'recommendation', width: 100, align: 'center' }
]

// 核心建议
const coreRecommendations = computed(() => {
  const recs = []
  const funds = selectedFundsWithMetrics.value
  const metrics = healthMetrics.value
  const riskData = riskReturnData.value
  
  if (funds.length === 0) return recs

  // 基于健康度给出核心建议
  if (metrics.total >= 70) {
    recs.push({
      type: 'positive',
      icon: '✨',
      title: '组合表现优异',
      description: `当前组合综合评分${metrics.total}分，各项指标均衡，建议保持现有配置。`
    })
  }

  // 收益建议
  const avgReturn = funds.reduce((sum, f) => sum + parseFloat(f.yearly_1_growth_rate || 0), 0) / funds.length
  if (avgReturn > 30) {
    recs.push({
      type: 'positive',
      icon: '🚀',
      title: '高收益潜力组合',
      description: `平均年化收益${avgReturn.toFixed(1)}%，超越市场平均水平，但需注意高收益伴随的波动风险。`
    })
  } else if (avgReturn > 15) {
    recs.push({
      type: 'neutral',
      icon: '📈',
      title: '稳健增长组合',
      description: `平均年化收益${avgReturn.toFixed(1)}%，属于稳健增长水平，风险收益比较为合理。`
    })
  } else if (avgReturn > 0) {
    recs.push({
      type: 'neutral',
      icon: '📊',
      title: '保守型组合',
      description: `平均年化收益${avgReturn.toFixed(1)}%，收益较为保守，可考虑适当增加成长型基金。`
    })
  }

  // 夏普比率建议
  const avgSharpe = riskData.funds?.length > 0
    ? riskData.funds.reduce((sum, f) => sum + (f.sharpe_ratios?.[volatilityPeriod.value] || 0), 0) / riskData.funds.length
    : 0
  if (avgSharpe > 1.5) {
    recs.push({
      type: 'positive',
      icon: '⚖️',
      title: '风险调整收益优秀',
      description: `平均夏普比率${avgSharpe.toFixed(2)}，风险调整后收益表现出色，资金使用效率高。`
    })
  } else if (avgSharpe > 0.5) {
    recs.push({
      type: 'neutral',
      icon: '✅',
      title: '风险收益比合理',
      description: `平均夏普比率${avgSharpe.toFixed(2)}，风险与收益较为匹配。`
    })
  }

  // 分散化建议
  if (funds.length >= 5) {
    recs.push({
      type: 'positive',
      icon: '🎯',
      title: '分散化程度良好',
      description: `已配置${funds.length}只基金，有效分散了非系统性风险。`
    })
  } else if (funds.length < 3) {
    recs.push({
      type: 'warning',
      icon: '🧩',
      title: '建议增加分散度',
      description: `当前仅${funds.length}只基金，集中度较高，建议增加至3-5只以分散风险。`
    })
  }

  return recs.slice(0, 4)
})

// 风险提示
const riskAlerts = computed(() => {
  const alerts = []
  const funds = selectedFundsWithMetrics.value
  const riskData = riskReturnData.value
  
  if (funds.length === 0) return alerts

  // 检查负收益
  const negativeReturnFunds = funds.filter(f => parseFloat(f.yearly_1_growth_rate || 0) < 0)
  if (negativeReturnFunds.length > 0) {
    alerts.push({
      level: 'warning',
      icon: '📉',
      title: `${negativeReturnFunds.length}只基金年度亏损`,
      description: `${negativeReturnFunds.map(f => f.fund_name.substring(0, 6)).join('、')} 近一年收益为负，建议关注。`
    })
  }

  // 检查高波动
  const highVolFunds = riskData.funds?.filter(f => 
    (f.volatilities?.[volatilityPeriod.value] || 0) > 30
  ) || []
  if (highVolFunds.length > 0) {
    alerts.push({
      level: 'warning',
      icon: '🌪️',
      title: '存在高波动基金',
      description: `${highVolFunds.length}只基金年化波动率超过30%，适合风险承受能力较高的投资者。`
    })
  }

  // 检查低夏普
  const lowSharpeFunds = riskData.funds?.filter(f => 
    (f.sharpe_ratios?.[volatilityPeriod.value] || 0) < 0
  ) || []
  if (lowSharpeFunds.length > 0) {
    alerts.push({
      level: 'danger',
      icon: '🚨',
      title: '风险收益比失衡',
      description: `${lowSharpeFunds.length}只基金夏普比率为负，收益无法覆盖风险，建议重新评估。`
    })
  }

  // 检查近期回调
  const recentDropFunds = funds.filter(f => parseFloat(f.monthly_1_growth_rate || 0) < -5)
  if (recentDropFunds.length > funds.length / 2) {
    alerts.push({
      level: 'info',
      icon: '❄️',
      title: '近期整体回调',
      description: `超过半数基金近1月下跌超5%，市场可能处于调整期，建议观望或逢低布局。`
    })
  }

  // 检查相关性
  const corrMatrix = correlationData.value.matrix || []
  if (corrMatrix.length > 0) {
    let highCorrCount = 0
    for (let i = 0; i < corrMatrix.length; i++) {
      for (let j = i + 1; j < corrMatrix[i].length; j++) {
        if (parseFloat(corrMatrix[i][j]) > 0.8) highCorrCount++
      }
    }
    if (highCorrCount > 0) {
      alerts.push({
        level: 'info',
        icon: '🔗',
        title: '部分基金高度相关',
        description: `${highCorrCount}对基金相关系数超过0.8，分散效果可能受限，可考虑替换部分基金。`
      })
    }
  }

  return alerts.slice(0, 4)
})

// 组合优化建议
const optimizationSuggestions = computed(() => {
  const suggestions = []
  const funds = selectedFundsWithMetrics.value
  const rankings = fundRankings.value
  const metrics = healthMetrics.value
  
  if (funds.length === 0) return suggestions

  // 基于排名给出优化建议
  const weakFunds = rankings.filter(f => f.overallScore < 40)
  if (weakFunds.length > 0) {
    suggestions.push({
      priority: 'high',
      priorityLabel: '高优先',
      priorityColor: 'red',
      icon: '🔄',
      title: '考虑替换弱势基金',
      content: `${weakFunds.map(f => f.fund_name.substring(0, 6)).join('、')} 综合评分较低，可考虑替换为同类型优质基金。`,
      action: '查看替代方案'
    })
  }

  // 分散化建议
  if (funds.length < 3) {
    suggestions.push({
      priority: 'high',
      priorityLabel: '高优先',
      priorityColor: 'red',
      icon: '➕',
      title: '增加基金数量',
      content: '当前基金数量较少，建议增加至3-5只以有效分散非系统性风险。',
      action: '去筛选基金'
    })
  }

  // 收益优化
  if (metrics.returnScore < 50) {
    suggestions.push({
      priority: 'medium',
      priorityLabel: '中优先',
      priorityColor: 'orange',
      icon: '📈',
      title: '提升收益能力',
      content: '组合整体收益能力偏弱，可适当增配近期表现优异的成长型基金。',
      action: '查看高收益基金'
    })
  }

  // 风险控制
  if (metrics.riskScore < 50) {
    suggestions.push({
      priority: 'medium',
      priorityLabel: '中优先',
      priorityColor: 'orange',
      icon: '🛡️',
      title: '加强风险控制',
      content: '组合风险调整收益偏低，建议增配夏普比率较高的稳健型基金。',
      action: '查看稳健基金'
    })
  }

  // 动能优化
  if (metrics.momentumScore < 40) {
    suggestions.push({
      priority: 'low',
      priorityLabel: '低优先',
      priorityColor: 'blue',
      icon: '🚀',
      title: '关注近期动能',
      content: '组合近期动能较弱，可关注近3个月表现突出的基金，适时调仓。',
      action: null
    })
  }

  // 定期再平衡
  if (funds.length >= 3) {
    suggestions.push({
      priority: 'low',
      priorityLabel: '建议',
      priorityColor: 'green',
      icon: '⚖️',
      title: '定期再平衡',
      content: '建议每季度检视组合权重，及时调整偏离目标配置的基金比例。',
      action: null
    })
  }

  return suggestions.slice(0, 6)
})

// 刷新分析
async function refreshAnalysis() {
  analysisLoading.value = true
  try {
    await Promise.all([
      loadTrendData(),
      loadRiskReturnData(),
      loadCorrelationData()
    ])
    nextTick(() => {
      initHealthGauge()
      initRadarChart()
    })
  } finally {
    analysisLoading.value = false
  }
}

// 获取评分颜色
function getScoreColor(score) {
  if (score >= 70) return '#52c41a'
  if (score >= 50) return '#1890ff'
  if (score >= 30) return '#faad14'
  return '#f5222d'
}

// 获取评分渐变色
function getScoreGradient(score) {
  if (score >= 70) return { '0%': '#87d068', '100%': '#52c41a' }
  if (score >= 50) return { '0%': '#69c0ff', '100%': '#1890ff' }
  if (score >= 30) return { '0%': '#ffc53d', '100%': '#faad14' }
  return { '0%': '#ff7875', '100%': '#f5222d' }
}

// 获取排名标签颜色
function getRankTagColor(rank, total) {
  const ratio = rank / total
  if (ratio <= 0.25) return 'green'
  if (ratio <= 0.5) return 'blue'
  if (ratio <= 0.75) return 'orange'
  return 'red'
}

// 初始化健康度仪表盘
function initHealthGauge() {
  if (!healthGaugeRef.value) return
  
  if (healthGaugeChart) {
    healthGaugeChart.dispose()
  }
  
  healthGaugeChart = echarts.init(healthGaugeRef.value)
  const score = healthMetrics.value.total
  
  healthGaugeChart.setOption({
    series: [{
      type: 'gauge',
      startAngle: 200,
      endAngle: -20,
      min: 0,
      max: 100,
      splitNumber: 10,
      itemStyle: {
        color: healthGrade.value.color
      },
      progress: {
        show: true,
        width: 20
      },
      pointer: {
        show: false
      },
      axisLine: {
        lineStyle: {
          width: 20,
          color: [[1, '#e6e6e6']]
        }
      },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      anchor: { show: false },
      title: {
        show: true,
        offsetCenter: [0, '20%'],
        fontSize: 14,
        color: '#666'
      },
      detail: {
        valueAnimation: true,
        width: '60%',
        lineHeight: 40,
        borderRadius: 8,
        offsetCenter: [0, '-15%'],
        fontSize: 32,
        fontWeight: 'bold',
        formatter: '{value}',
        color: healthGrade.value.color
      },
      data: [{
        value: score,
        name: '健康度'
      }]
    }]
  })
}

// 初始化雷达图
function initRadarChart() {
  if (!radarChartRef.value) return
  
  if (radarChart) {
    radarChart.dispose()
  }
  
  radarChart = echarts.init(radarChartRef.value)
  const rankings = fundRankings.value.slice(0, 5) // 最多显示5只
  
  if (rankings.length === 0) {
    radarChart.setOption({
      title: { text: '暂无数据', left: 'center', top: 'center' }
    })
    return
  }

  const indicators = [
    { name: '收益能力', max: 100 },
    { name: '夏普比率', max: 100 },
    { name: '稳定性', max: 100 },
    { name: '近期动能', max: 100 },
    { name: '综合评分', max: 100 }
  ]

  const n = fundRankings.value.length
  const series = rankings.map((fund, idx) => ({
    name: fund.fund_name.substring(0, 8),
    value: [
      Math.round((n - fund.returnRank + 1) / n * 100),
      Math.round((n - fund.sharpeRank + 1) / n * 100),
      Math.round((n - fund.volatilityRank + 1) / n * 100),
      Math.round((n - fund.momentumRank + 1) / n * 100),
      fund.overallScore
    ],
    areaStyle: { opacity: 0.1 }
  }))

  radarChart.setOption({
    title: {
      text: '基金多维度对比',
      left: 'center',
      top: 5,
      textStyle: { fontSize: 14 }
    },
    tooltip: {
      trigger: 'item'
    },
    legend: {
      type: 'scroll',
      bottom: 0,
      data: series.map(s => s.name)
    },
    radar: {
      indicator: indicators,
      center: ['50%', '55%'],
      radius: '60%'
    },
    series: [{
      type: 'radar',
      data: series
    }],
    color: ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1']
  })
}

// 图表引用
const trendChartRef = ref(null)
const riskReturnChartRef = ref(null)
const correlationChartRef = ref(null)
const healthGaugeRef = ref(null)
const radarChartRef = ref(null)

let trendChart = null
let riskReturnChart = null
let correlationChart = null
let healthGaugeChart = null
let radarChart = null

// 分析加载状态
const analysisLoading = ref(false)

// 全选
function selectAll() {
  selectedFundCodes.value = props.fundPool.slice(0, 10).map(f => f.fund_code)
  loadTrendData()
}

// 清空选择
function clearSelection() {
  selectedFundCodes.value = []
}

// 格式化收益率 - 增强版，处理 null/undefined
function formatRate(value) {
  if (value == null || value === '' || value === undefined) return '--'
  const num = parseFloat(value)
  if (isNaN(num)) return '--'
  return num >= 0 ? `+${num.toFixed(2)}%` : `${num.toFixed(2)}%`
}

// 格式化数字 - 增强版，处理 null/undefined
function formatNumber(value) {
  if (value == null || value === '' || value === undefined) return '--'
  const num = parseFloat(value)
  if (isNaN(num)) return '--'
  return num.toFixed(2)
}

// 获取收益率样式
function getRateClass(value) {
  if (value == null || value === '' || value === undefined) return ''
  const num = parseFloat(value)
  if (isNaN(num)) return ''
  return num >= 0 ? 'text-up' : 'text-down'
}

// 获取夏普比率样式
function getSharpeClass(value) {
  if (value == null || value === '' || value === undefined) return ''
  const num = parseFloat(value)
  if (isNaN(num)) return ''
  if (num >= 2) return 'text-excellent'
  if (num >= 1) return 'text-good'
  return ''
}

// 获取排名颜色
function getRankColor(rank) {
  const r = parseInt(rank)
  if (isNaN(r)) return 'default'
  if (r <= 10) return 'gold'
  if (r <= 50) return 'red'
  if (r <= 100) return 'blue'
  return 'default'
}

// 计算累计收益率
function calculateCumulativeReturns(data) {
  if (!data || data.length === 0) return []
  
  const result = []
  let baseValue = null
  
  for (const item of data) {
    if (baseValue === null && item.net_value) {
      baseValue = item.net_value
    }
    if (baseValue && item.net_value) {
      const return_rate = ((item.net_value - baseValue) / baseValue * 100)
      result.push({
        date: item.date,
        value: return_rate.toFixed(2)
      })
    }
  }
  
  return result
}

// 收益走势图表（包含基准指数）
function initTrendChart() {
  if (!trendChartRef.value) return
  
  if (trendChart) {
    trendChart.dispose()
  }
  
  trendChart = echarts.init(trendChartRef.value)
  const data = trendData.value
  const bmData = benchmarkData.value
  
  if ((!data || Object.keys(data).length === 0) && (!bmData || Object.keys(bmData).length === 0)) {
    trendChart.setOption({
      title: { text: '暂无数据', left: 'center', top: 'center' }
    })
    return
  }

  // 获取所有日期（包括基准指数的日期）
  const allDates = new Set()
  Object.values(data).forEach(fund => {
    fund.data.forEach(item => allDates.add(item.date))
  })
  Object.values(bmData).forEach(index => {
    index.data.forEach(item => allDates.add(item.date))
  })
  const dates = Array.from(allDates).sort()

  // 构建基金series
  const series = Object.entries(data).map(([code, fund]) => {
    const cumulativeData = calculateCumulativeReturns(fund.data)
    const dataMap = new Map(cumulativeData.map(item => [item.date, item.value]))
    
    return {
      name: fund.fund_name,
      type: 'line',
      smooth: true,
      symbol: 'none',
      data: dates.map(date => dataMap.get(date) || null)
    }
  })

  // 构建基准指数series
  Object.entries(bmData).forEach(([code, index]) => {
    // 计算基准指数的累计收益率
    const indexData = index.data
    if (indexData.length > 0) {
      const baseClose = indexData[0].close
      const cumulativeData = indexData.map(item => ({
        date: item.date,
        value: baseClose ? ((item.close - baseClose) / baseClose * 100).toFixed(2) : null
      }))
      const dataMap = new Map(cumulativeData.map(item => [item.date, item.value]))
      
      series.push({
        name: `📊 ${index.index_name}`,
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: {
          type: 'dashed',
          width: 2
        },
        data: dates.map(date => dataMap.get(date) || null)
      })
    }
  })

  trendChart.setOption({
    tooltip: { 
      trigger: 'axis',
      formatter: (params) => {
        let result = params[0].axisValue + '<br/>'
        params.forEach(p => {
          if (p.value !== null && p.value !== undefined) {
            const color = p.value >= 0 ? '#f5222d' : '#52c41a'
            result += `${p.marker} ${p.seriesName}: <span style="color:${color};font-weight:500">${p.value >= 0 ? '+' : ''}${p.value}%</span><br/>`
          }
        })
        return result
      }
    },
    legend: { 
      type: 'scroll', 
      bottom: 0,
      data: series.map(s => s.name)
    },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
    xAxis: { 
      type: 'category', 
      data: dates,
      axisLabel: { formatter: (value) => dayjs(value).format('MM-DD') }
    },
    yAxis: { 
      type: 'value', 
      name: '累计收益(%)',
      axisLabel: { formatter: (value) => value + '%' }
    },
    series,
    color: ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16', '#8c8c8c', '#595959']
  })
}

// 风险收益散点图 - 专业版
function initRiskReturnChart() {
  if (!riskReturnChartRef.value) return
  
  if (riskReturnChart) {
    riskReturnChart.dispose()
    riskReturnChart = null
  }
  
  riskReturnChart = echarts.init(riskReturnChartRef.value)
  
  const funds = riskReturnData.value.funds
  const selectedAvg = riskReturnData.value.selected_avg
  const marketAvg = riskReturnData.value.market_avg
  
  if (!funds || funds.length === 0) {
    riskReturnChart.setOption({
      title: { text: '暂无数据', left: 'center', top: 'center' }
    })
    return
  }

  // 构建散点数据
  const scatterData = funds.map(fund => ({
    name: fund.name,
    value: [
      fund.volatilities[volatilityPeriod.value] || 0,
      fund.returns[riskPeriod.value] || 0
    ],
    code: fund.code,
    itemStyle: {
      shadowBlur: 10,
      shadowColor: 'rgba(0, 0, 0, 0.2)'
    }
  }))

  // 计算坐标轴范围
  const volatilities = scatterData.map(d => d.value[0]).filter(v => v > 0)
  const returns = scatterData.map(d => d.value[1]).filter(v => v !== 0)
  
  const minVol = 0
  const maxVol = Math.max(...volatilities) * 1.3
  const minRet = Math.min(0, Math.min(...returns) * 1.2)
  const maxRet = Math.max(...returns) * 1.3

  // 选中基金平均线
  const selectedAvgVol = selectedAvg.volatilities?.[volatilityPeriod.value]
  const selectedAvgRet = selectedAvg.returns?.[riskPeriod.value]
  
  // 全市场平均线
  const marketAvgRet = marketAvg[riskPeriod.value]
  
  // 无风险收益率（从后端获取，默认2.5%）
  const riskFreeRate = riskReturnData.value.risk_free_rate || 2.5

  const series = []
  
  // 象限背景 - 使用不同透明度区分
  if (selectedAvgVol && selectedAvgRet) {
    series.push({
      type: 'scatter',
      markArea: {
        silent: true,
        itemStyle: {
          color: 'transparent'
        },
        data: [
          // 高收益低风险 - 理想区域（浅绿色背景）
          [
            { 
              name: '理想区', 
              xAxis: 0, 
              yAxis: Math.max(selectedAvgRet, riskFreeRate),
              itemStyle: { color: 'rgba(82, 196, 26, 0.08)' }
            },
            { xAxis: selectedAvgVol, yAxis: maxRet }
          ],
          // 高收益高风险（浅蓝色背景）
          [
            { 
              name: '进取区', 
              xAxis: selectedAvgVol, 
              yAxis: Math.max(selectedAvgRet, riskFreeRate),
              itemStyle: { color: 'rgba(24, 144, 255, 0.05)' }
            },
            { xAxis: maxVol, yAxis: maxRet }
          ],
          // 低收益低风险（浅灰色背景）
          [
            { 
              name: '保守区', 
              xAxis: 0, 
              yAxis: minRet,
              itemStyle: { color: 'rgba(150, 150, 150, 0.05)' }
            },
            { xAxis: selectedAvgVol, yAxis: Math.min(selectedAvgRet, riskFreeRate) }
          ],
          // 低收益高风险 - 危险区域（浅红色背景）
          [
            { 
              name: '危险区', 
              xAxis: selectedAvgVol, 
              yAxis: minRet,
              itemStyle: { color: 'rgba(245, 34, 45, 0.05)' }
            },
            { xAxis: maxVol, yAxis: Math.min(selectedAvgRet, riskFreeRate) }
          ]
        ],
        label: {
          show: true,
          position: 'inside',
          fontSize: 11,
          fontWeight: 'bold',
          color: '#666'
        }
      }
    })
    
    // 添加参考线组
    series.push({
      type: 'line',
      markLine: {
        silent: true,
        symbol: ['none', 'none'],
        lineStyle: {
          type: 'dashed',
          width: 1.5
        },
        data: [
          { 
            xAxis: selectedAvgVol, 
            lineStyle: { color: '#1890ff', opacity: 0.6 },
            label: { 
              show: true, 
              formatter: '平均波动率: {c}%',
              position: 'end',
              fontSize: 10,
              color: '#1890ff'
            }
          },
          { 
            yAxis: selectedAvgRet, 
            lineStyle: { color: '#1890ff', opacity: 0.6 },
            label: { 
              show: true, 
              formatter: '选中平均: {c}%',
              position: 'end',
              fontSize: 10,
              color: '#1890ff'
            }
          },
          { 
            yAxis: marketAvgRet, 
            lineStyle: { color: '#faad14', opacity: 0.8 },
            label: { 
              show: true, 
              formatter: '市场平均: {c}%',
              position: 'start',
              fontSize: 10,
              color: '#faad14'
            }
          },
          { 
            yAxis: riskFreeRate, 
            lineStyle: { color: '#52c41a', type: 'solid', opacity: 0.6, width: 2 },
            label: { 
              show: true, 
              formatter: `无风险利率: ${riskFreeRate}%`,
              position: 'start',
              fontSize: 10,
              color: '#52c41a',
              fontWeight: 'bold'
            }
          }
        ]
      }
    })
    
    // 添加资本市场线 (CML) - 从原点到最高夏普比率的连线
    const bestFund = riskReturnData.value.best_fund
    
    if (bestFund && bestFund.volatility && bestFund.volatility > 0) {
      const bestRet = bestFund.return || 0
      const bestVol = bestFund.volatility
      // CML斜率 = (最优基金收益 - 无风险利率) / 最优基金波动率
      const slope = (bestRet - riskFreeRate) / bestVol
      
      series.push({
        name: '资本市场线',
        type: 'line',
        smooth: false,
        symbol: 'none',
        lineStyle: {
          color: '#722ed1',
          type: 'dotted',
          width: 2,
          opacity: 0.6
        },
        data: [
          [0, riskFreeRate],
          [bestVol * 1.5, riskFreeRate + slope * bestVol * 1.5]
        ],
        tooltip: { show: false }
      })
    }
  }
  
  // 添加散点数据
  series.push({
    type: 'scatter',
    symbolSize: (data) => {
      // 根据排名调整大小，表现好的更大
      const ret = data[1]
      const vol = data[0]
      if (ret > (selectedAvgRet || 0) && vol < (selectedAvgVol || 20)) return 22
      if (ret > (selectedAvgRet || 0)) return 18
      return 14
    },
    data: scatterData,
    itemStyle: {
      color: (params) => {
        const ret = params.data.value[1]
        const vol = params.data.value[0]
        const avgRet = selectedAvgRet || 0
        const avgVol = selectedAvgVol || 20
        
        if (ret > avgRet && vol < avgVol) return '#52c41a'  // 高收益低风险 - 优秀
        if (ret > avgRet && vol >= avgVol) return '#1890ff'  // 高收益 - 良好
        if (ret <= avgRet && vol < avgVol) return '#faad14'  // 低风险 - 稳健
        return '#f5222d'  // 低收益高风险 - 警惕
      },
      borderColor: '#fff',
      borderWidth: 2
    },
    emphasis: {
      scale: 1.5,
      itemStyle: {
        shadowBlur: 20,
        shadowColor: 'rgba(0, 0, 0, 0.3)'
      }
    },
    label: {
      show: true,
      formatter: (params) => {
        // 只显示表现优秀的基金名称
        const ret = params.data.value[1]
        const vol = params.data.value[0]
        const avgRet = selectedAvgRet || 0
        const avgVol = selectedAvgVol || 20
        
        if (ret > avgRet && vol < avgVol) {
          return params.data.name.substring(0, 4)
        }
        return ''
      },
      position: 'top',
      fontSize: 10,
      color: '#52c41a',
      fontWeight: 'bold'
    }
  })

  riskReturnChart.setOption({
    title: {
      text: '风险-收益分布图',
      subtext: `波动率: ${volatilityPeriod.value} | 收益: ${riskPeriod.value} | 无风险利率: ${riskFreeRate}%`,
      left: 'center',
      top: 5,
      textStyle: { fontSize: 14, fontWeight: 'bold' },
      subtextStyle: { fontSize: 11, color: '#666' }
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#ddd',
      borderWidth: 1,
      textStyle: { color: '#333' },
      formatter: (params) => {
        if (params.componentType === 'markLine' || params.componentType === 'markArea') {
          return params.name
        }
        const data = params.data
        const ret = data.value[1]
        const vol = data.value[0]
        // 从fund数据中获取夏普比率（后端已计算）
        const fundCode = data.code
        const fundData = funds.find(f => f.code === fundCode)
        const sharpe = fundData?.sharpe_ratios?.[volatilityPeriod.value] || 
                       (vol > 0 ? ((ret - riskFreeRate) / vol).toFixed(2) : '--')
        
        // 评估等级
        let grade = ''
        if (ret > (selectedAvgRet || 0) && vol < (selectedAvgVol || 20)) grade = '⭐⭐⭐ 优秀'
        else if (ret > (selectedAvgRet || 0)) grade = '⭐⭐ 良好'
        else if (vol < (selectedAvgVol || 20)) grade = '⭐ 稳健'
        else grade = '⚠ 警惕'
        
        return `
          <div style="padding: 5px;">
            <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #1890ff;">${data.name}</div>
            <div style="margin: 3px 0;">📊 年化波动率: <strong>${vol.toFixed(2)}%</strong></div>
            <div style="margin: 3px 0;">📈 收益率: <strong style="color: ${ret >= 0 ? '#52c41a' : '#f5222d'};">${ret >= 0 ? '+' : ''}${ret.toFixed(2)}%</strong></div>
            <div style="margin: 3px 0;">📉 夏普比率: <strong>${sharpe}</strong></div>
            <div style="margin-top: 8px; padding-top: 5px; border-top: 1px solid #eee; color: #666; font-size: 12px;">${grade}</div>
          </div>
        `
      }
    },
    legend: {
      data: ['基金', '资本市场线 (CML)'],
      bottom: 5,
      itemGap: 20
    },
    grid: { 
      left: '12%', 
      right: '8%', 
      bottom: '18%', 
      top: '20%', 
      containLabel: true 
    },
    xAxis: { 
      type: 'value', 
      name: '年化波动率 σ (%)',
      nameLocation: 'middle',
      nameGap: 30,
      nameTextStyle: { fontWeight: 'bold' },
      min: minVol,
      max: maxVol,
      axisLine: { lineStyle: { color: '#999' } },
      splitLine: { 
        lineStyle: { 
          type: 'dashed',
          color: '#eee'
        } 
      },
      axisLabel: { formatter: '{value}%' }
    },
    yAxis: { 
      type: 'value', 
      name: '收益率 E(R) (%)',
      nameLocation: 'middle',
      nameGap: 40,
      nameTextStyle: { fontWeight: 'bold' },
      min: minRet,
      max: maxRet,
      axisLine: { lineStyle: { color: '#999' } },
      splitLine: { 
        lineStyle: { 
          type: 'dashed',
          color: '#eee'
        } 
      },
      axisLabel: { formatter: '{value}%' }
    },
    series
  })
}

// 相关性数据
const correlationData = ref({ funds: [], matrix: [] })
const correlationLoading = ref(false)
const showCorrelationEmpty = computed(() => selectedFundCodes.value.length < 2)

// 加载相关性数据
async function loadCorrelationData() {
  if (selectedFundCodes.value.length < 2) {
    // 当基金数量不足时，清空相关性数据并更新图表
    correlationData.value = { funds: [], matrix: [] }
    nextTick(() => {
      initCorrelationChart()
    })
    return
  }
  
  correlationLoading.value = true
  try {
    const { startDate, endDate } = getDateRange()
    const response = await fundAnalysisApi.calculateCorrelation(
      selectedFundCodes.value,
      startDate,
      endDate
    )
    
    if (response.success) {
      correlationData.value = response.data
    } else {
      correlationData.value = { funds: [], matrix: [] }
      message.warning(response.message || '计算相关性失败')
    }
  } catch (error) {
    console.error('加载相关性数据失败:', error)
    // 出错时也应清空数据并更新图表
    correlationData.value = { funds: [], matrix: [] }
  } finally {
    correlationLoading.value = false
    nextTick(() => {
      initCorrelationChart()
    })
  }
}

// 相关性热力图
function initCorrelationChart() {
  if (!correlationChartRef.value) return
  
  // 确保先清理旧实例
  if (correlationChart) {
    correlationChart.dispose()
    correlationChart = null
  }
  
  const funds = correlationData.value.funds
  const matrix = correlationData.value.matrix
  
  // 检查数据是否有效
  if (!funds || funds.length === 0 || !matrix || matrix.length === 0) {
    // 如果数据无效且图表容器存在，创建一个提示
    correlationChart = echarts.init(correlationChartRef.value)
    correlationChart.setOption({
      title: { text: '暂无数据', left: 'center', top: 'center' }
    })
    return
  }
  
  correlationChart = echarts.init(correlationChartRef.value)
  
  const names = funds.map(f => f.name.substring(0, 8))
  const data = []
  
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[i].length; j++) {
      data.push([i, j, parseFloat(matrix[i][j]).toFixed(2)])
    }
  }

  correlationChart.setOption({
    tooltip: { 
      position: 'top',
      formatter: (params) => {
        const fund1 = funds[params.data[0]]?.name
        const fund2 = funds[params.data[1]]?.name
        const corr = params.data[2]
        let desc = ''
        if (corr >= 0.8) desc = '高度相关'
        else if (corr >= 0.5) desc = '中度相关'
        else if (corr >= 0.3) desc = '低度相关'
        else desc = '几乎不相关'
        return `${fund1} vs ${fund2}<br/>相关系数: <strong>${corr}</strong><br/>${desc}`
      }
    },
    grid: { height: '60%', top: '10%', left: '15%', right: '5%', bottom: '25%' },
    xAxis: { 
      type: 'category', 
      data: names, 
      splitArea: { show: true },
      axisLabel: { rotate: 45, fontSize: 11 }
    },
    yAxis: { 
      type: 'category', 
      data: names, 
      splitArea: { show: true },
      axisLabel: { fontSize: 11 }
    },
    visualMap: {
      min: 0,
      max: 1,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '5%',
      itemWidth: 15,
      itemHeight: 100,
      textStyle: { fontSize: 10 },
      inRange: { 
        color: ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b'] 
      }
    },
    series: [{
      type: 'heatmap',
      data,
      label: { 
        show: true,
        formatter: (params) => params.data[2],
        fontSize: 11,
        fontWeight: 'bold'
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  })
}

// 监听选择变化，更新图表
watch(selectedFundCodes, () => {
  if (selectedFundCodes.value.length > 0) {
    loadTrendData()
    loadRiskReturnData()
    // 如果当前是专业指标视图，也要刷新
    if (metricsViewMode.value === 'professional') {
      loadProfessionalMetrics()
    }
  }
  // 无论基金数量多少都要调用，因为数量不足时也要更新界面状态
  loadCorrelationData()
  // 更新智能分析报告图表
  nextTick(() => {
    initHealthGauge()
    initRadarChart()
  })
}, { deep: true })

// 监听基准指数选择变化
watch(selectedBenchmarks, () => {
  if (selectedFundCodes.value.length > 0) {
    loadTrendData()
  }
}, { deep: true })

// 监听指标视图模式变化
watch(metricsViewMode, (newMode) => {
  if (newMode === 'professional' && professionalMetricsData.value.length === 0) {
    loadProfessionalMetrics()
  }
})

// 加载基准指数列表
async function loadBenchmarkList() {
  try {
    const response = await benchmarkApi.getBenchmarkList()
    if (response.success) {
      benchmarkList.value = response.data
    }
  } catch (error) {
    console.error('加载基准指数列表失败:', error)
  }
}

onMounted(() => {
  // 加载基准指数列表
  loadBenchmarkList()
  
  // 默认选中前3只
  if (props.fundPool.length > 0) {
    selectedFundCodes.value = props.fundPool.slice(0, 3).map(f => f.fund_code)
    loadTrendData()
    loadRiskReturnData()
    loadCorrelationData()
    // 初始化智能分析报告图表
    nextTick(() => {
      initHealthGauge()
      initRadarChart()
    })
  }
})

// 窗口大小变化时重新渲染
window.addEventListener('resize', () => {
  trendChart && trendChart.resize()
  riskReturnChart && riskReturnChart.resize()
  correlationChart && correlationChart.resize()
  healthGaugeChart && healthGaugeChart.resize()
  radarChart && radarChart.resize()
})
</script>

<style scoped lang="less">
.fund-analysis {
  .selection-card {
    .selection-header {
      display: flex;
      align-items: center;
      
      .label {
        margin-right: 12px;
        font-weight: 500;
      }
    }
  }

  .metrics-card {
    :deep(.ant-table-cell) {
      padding: 8px !important;
    }

    .metrics-title {
      display: flex;
      align-items: center;
    }

    .star-rating {
      color: #ffd666;
      font-size: 14px;
      letter-spacing: 1px;
    }

    .benchmark-info {
      margin-top: 8px;
      padding: 8px 12px;
      background: #fafafa;
      border-radius: 6px;

      .benchmark-warning {
        margin-top: 8px;
        padding: 8px;
        background: #fff7e6;
        border-radius: 4px;
        display: flex;
        align-items: center;
        gap: 8px;

        .warning-text {
          font-size: 12px;
          color: #666;
        }
      }
    }
  }

  .chart-card {
    .chart {
      height: 350px;
    }
    .chart-placeholder {
      height: 350px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
  
  .risk-return-card {
    .chart {
      height: 480px;
    }
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

  .analysis-content {
    h4 {
      margin-bottom: 16px;
      color: #262626;
    }
  }

  // 智能分析报告样式
  .analysis-report-card {
    .report-title {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 16px;
      font-weight: 600;
    }

    .empty-analysis {
      padding: 60px 0;
    }

    .section-title {
      font-size: 15px;
      font-weight: 600;
      color: #262626;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
    }

    // 健康度仪表盘
    .health-dashboard {
      .health-score-container {
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .health-gauge {
        width: 100%;
        height: 180px;
      }

      .health-details {
        width: 100%;
        padding: 0 16px;

        .detail-item {
          display: flex;
          align-items: center;
          margin-bottom: 8px;

          .label {
            width: 70px;
            font-size: 12px;
            color: #666;
          }

          :deep(.ant-progress) {
            flex: 1;
          }
        }
      }
    }

    // 雷达图
    .radar-chart {
      height: 320px;
    }

    // 核心指标卡片
    .metric-card {
      background: linear-gradient(135deg, #f5f7fa 0%, #fff 100%);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      border: 1px solid #e8e8e8;
      transition: all 0.3s;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .metric-icon {
        font-size: 28px;
      }

      .metric-content {
        flex: 1;
        min-width: 0;

        .metric-label {
          font-size: 12px;
          color: #8c8c8c;
          margin-bottom: 4px;
        }

        .metric-value {
          font-size: 14px;
          font-weight: 600;
          color: #262626;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .metric-detail {
          font-size: 13px;
          font-weight: 500;
          margin-top: 2px;
        }
      }

      &.best-return {
        border-left: 3px solid #ffd666;
      }

      &.best-sharpe {
        border-left: 3px solid #1890ff;
      }

      &.lowest-risk {
        border-left: 3px solid #52c41a;
      }

      &.best-momentum {
        border-left: 3px solid #f5222d;
      }
    }

    // 排名表格
    .ranking-section {
      .ranking-table {
        :deep(.ant-table-cell) {
          padding: 10px 8px !important;
        }

        .fund-name-cell {
          .name {
            font-weight: 500;
            font-size: 13px;
          }
          .code {
            font-size: 11px;
            color: #8c8c8c;
          }
        }

        .score-cell {
          display: flex;
          align-items: center;
          justify-content: center;
        }
      }
    }

    // 建议区域
    .recommendations-section {
      .recommendation-group {
        background: #fafafa;
        border-radius: 8px;
        padding: 16px;
        height: 100%;

        .group-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #262626;
          margin-bottom: 12px;

          .icon {
            font-size: 18px;
          }
        }

        .recommendation-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .recommendation-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 6px;
          background: #fff;
          border-left: 3px solid transparent;

          &.positive {
            border-left-color: #52c41a;
            background: #f6ffed;
          }

          &.neutral {
            border-left-color: #1890ff;
            background: #e6f7ff;
          }

          &.warning {
            border-left-color: #faad14;
            background: #fffbe6;
          }

          &.danger {
            border-left-color: #f5222d;
            background: #fff1f0;
          }

          &.info {
            border-left-color: #8c8c8c;
            background: #f5f5f5;
          }

          .rec-icon {
            font-size: 20px;
            flex-shrink: 0;
          }

          .rec-content {
            flex: 1;
            min-width: 0;

            .rec-title {
              font-size: 13px;
              font-weight: 600;
              color: #262626;
              margin-bottom: 2px;
            }

            .rec-desc {
              font-size: 12px;
              color: #666;
              line-height: 1.5;
            }
          }
        }

        .no-alerts {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          color: #52c41a;
          font-size: 14px;
          gap: 8px;
        }
      }
    }

    // 优化建议卡片
    .optimization-section {
      .optimization-card {
        background: #fff;
        border: 1px solid #e8e8e8;
        border-radius: 8px;
        padding: 14px;
        margin-bottom: 12px;
        transition: all 0.3s;

        &:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        &.high {
          border-left: 3px solid #f5222d;
        }

        &.medium {
          border-left: 3px solid #faad14;
        }

        &.low {
          border-left: 3px solid #1890ff;
        }

        .opt-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;

          .opt-icon {
            font-size: 18px;
          }

          .opt-title {
            flex: 1;
            font-size: 13px;
            font-weight: 600;
            color: #262626;
          }
        }

        .opt-content {
          font-size: 12px;
          color: #666;
          line-height: 1.6;
        }

        .opt-action {
          margin-top: 8px;
          text-align: right;
        }
      }
    }
  }
}

/* 移动端适配 - 指标卡片标题 */
@media (max-width: 768px) {
  .metrics-card .ant-card-head {
    flex-wrap: wrap;
    height: auto;
    min-height: 50px;
  }
  .metrics-card .ant-card-head-title {
    width: 100%;
    padding-bottom: 8px;
  }
  .metrics-card .ant-card-head-title .metrics-title {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    width: 100%;
  }
  .metrics-card .ant-card-head-title .metrics-title .ant-radio-group {
    margin-left: 0 !important;
    width: 100%;
  }
  .metrics-card .ant-card-head-title .metrics-title .ant-radio-button-wrapper {
    flex: 1;
    text-align: center;
    min-width: 50px;
  }
  .metrics-card .ant-card-head-extra {
    width: 100%;
    padding-top: 8px;
    border-top: 1px solid #f0f0f0;
  }
  .metrics-card .ant-card-head-extra .ant-space {
    flex-wrap: wrap;
    gap: 4px;
  }
}
</style>
