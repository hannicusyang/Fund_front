<template>
  <div class="fund-model-container">
    <!-- 顶部导航 -->
    <a-card :bordered="false" class="header-card">
      <div class="header-content">
        <div class="title-section">
          <FundOutlined class="title-icon" />
          <div class="title-text">
            <h1>基金投资模型实验室</h1>
            <span class="subtitle">基于公募基金的量化投资组合构建与回测</span>
          </div>
        </div>
        <a-radio-group v-model:value="activeTab" button-style="solid" size="large">
          <a-radio-button value="screening">
            <FilterOutlined /> 基金筛选
          </a-radio-button>
          <a-radio-button value="analysis">
            <BarChartOutlined /> 指标分析
          </a-radio-button>
          <a-radio-button value="portfolio">
            <PieChartOutlined /> 组合构建
          </a-radio-button>
          <a-radio-button value="backtest">
            <LineChartOutlined /> 回测验证
          </a-radio-button>
        </a-radio-group>
      </div>
    </a-card>

    <!-- ========== 基金筛选模块 ========== -->
    <div v-if="activeTab === 'screening'" class="tab-content">
      <a-row :gutter="16">
        <!-- 筛选条件 -->
        <a-col :xs="24" :lg="6">
          <a-card title="筛选条件" class="panel-card">
            <a-form :model="screeningForm" layout="vertical">
              <a-form-item>
                <template #label>
                  <a-tooltip title="基金类型决定风险收益特征">
                    <span>基金类型 <InfoCircleOutlined /></span>
                  </a-tooltip>
                </template>
                <a-select v-model:value="screeningForm.fundType" mode="multiple" placeholder="选择基金类型">
                  <a-select-option value="equity">股票型</a-select-option>
                  <a-select-option value="hybrid">混合型</a-select-option>
                  <a-select-option value="bond">债券型</a-select-option>
                  <a-select-option value="index">指数型</a-select-option>
                  <a-select-option value="qdii">QDII</a-select-option>
                  <a-select-option value="money">货币型</a-select-option>
                </a-select>
              </a-form-item>

              <a-form-item>
                <template #label>
                  <a-tooltip title="基金成立时间，建议选择3年以上有历史业绩的基金">
                    <span>成立年限 <InfoCircleOutlined /></span>
                  </a-tooltip>
                </template>
                <a-slider v-model:value="screeningForm.establishYears" :min="0" :max="10" />
                <span class="slider-label">{{ screeningForm.establishYears }} 年以上</span>
              </a-form-item>

              <a-form-item>
                <template #label>
                  <a-tooltip title="基金规模，过大或过小都有各自优缺点">
                    <span>基金规模（亿元） <InfoCircleOutlined /></span>
                  </a-tooltip>
                </template>
                <a-row :gutter="8">
                  <a-col :span="12">
                    <a-input-number v-model:value="screeningForm.scaleMin" placeholder="最小" style="width: 100%" />
                  </a-col>
                  <a-col :span="12">
                    <a-input-number v-model:value="screeningForm.scaleMax" placeholder="最大" style="width: 100%" />
                  </a-col>
                </a-row>
              </a-form-item>

              <a-form-item>
                <template #label>
                  <a-tooltip title="基金经理任职年限，经验越丰富通常越稳健">
                    <span>经理任职年限 <InfoCircleOutlined /></span>
                  </a-tooltip>
                </template>
                <a-slider v-model:value="screeningForm.managerYears" :min="0" :max="10" />
                <span class="slider-label">{{ screeningForm.managerYears }} 年以上</span>
              </a-form-item>

              <a-divider />

              <a-form-item>
                <template #label>
                  <a-tooltip title="夏普比率：风险调整后收益，越高越好">
                    <span>夏普比率 <InfoCircleOutlined /></span>
                  </a-tooltip>
                </template>
                <a-row :gutter="8">
                  <a-col :span="12">
                    <a-input-number v-model:value="screeningForm.sharpeMin" placeholder="最小" :step="0.1" />
                  </a-col>
                  <a-col :span="12">
                    <a-select v-model:value="screeningForm.sharpePeriod" style="width: 100%">
                      <a-select-option value="1y">近1年</a-select-option>
                      <a-select-option value="3y">近3年</a-select-option>
                      <a-select-option value="5y">近5年</a-select-option>
                    </a-select>
                  </a-col>
                </a-row>
              </a-form-item>

              <a-form-item>
                <template #label>
                  <a-tooltip title="最大回撤：从高点到低点的最大跌幅，越小越好">
                    <span>最大回撤 <InfoCircleOutlined /></span>
                  </a-tooltip>
                </template>
                <a-row :gutter="8">
                  <a-col :span="12">
                    <a-input-number v-model:value="screeningForm.drawdownMax" addon-after="%" />
                  </a-col>
                  <a-col :span="12">
                    <a-select v-model:value="screeningForm.drawdownPeriod" style="width: 100%">
                      <a-select-option value="1y">近1年</a-select-option>
                      <a-select-option value="3y">近3年</a-select-option>
                      <a-select-option value="5y">近5年</a-select-option>
                    </a-select>
                  </a-col>
                </a-row>
              </a-form-item>

              <a-form-item>
                <template #label>
                  <a-tooltip title="年化收益率：基金的年化回报率">
                    <span>年化收益率 <InfoCircleOutlined /></span>
                  </a-tooltip>
                </template>
                <a-row :gutter="8">
                  <a-col :span="12">
                    <a-input-number v-model:value="screeningForm.returnMin" addon-after="%" />
                  </a-col>
                  <a-col :span="12">
                    <a-select v-model:value="screeningForm.returnPeriod" style="width: 100%">
                      <a-select-option value="1y">近1年</a-select-option>
                      <a-select-option value="3y">近3年</a-select-option>
                      <a-select-option value="5y">近5年</a-select-option>
                      <a-select-option value="since">成立以来</a-select-option>
                    </a-select>
                  </a-col>
                </a-row>
              </a-form-item>

              <a-button type="primary" block size="large" @click="runScreening">
                <SearchOutlined /> 执行筛选
              </a-button>
              <a-button block style="margin-top: 8px;" @click="resetScreening">重置条件</a-button>
            </a-form>
          </a-card>
        </a-col>

        <!-- 筛选结果 -->
        <a-col :xs="24" :lg="18">
          <a-card title="筛选结果" class="panel-card">
            <template #extra>
              <a-space>
                <span>共 {{ filteredFunds.length }} 只基金</span>
                <a-button type="primary" @click="addAllToPool" :disabled="selectedFunds.length === 0">
                  加入备选池 ({{ selectedFunds.length }})
                </a-button>
                <a-button @click="exportResults">导出</a-button>
              </a-space>
            </template>

            <a-table
              :data-source="filteredFunds"
              :columns="fundColumns"
              :row-selection="rowSelection"
              :pagination="paginationConfig"
              size="small"
              @change="handleTableChange"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'name'">
                  <div class="fund-name-cell">
                    <div class="fund-name">{{ record.name }}</div>
                    <div class="fund-code">{{ record.code }} | {{ record.type }}</div>
                  </div>
                </template>

                <template v-if="column.key === 'return1y' || column.key === 'return3y' || column.key === 'sharpe'">
                  <span :class="getReturnClass(record[column.key])">
                    {{ formatPercent(record[column.key]) }}
                  </span>
                </template>

                <template v-if="column.key === 'maxDrawdown'">
                  <span class="text-down">{{ formatPercent(record.maxDrawdown) }}</span>
                </template>

                <template v-if="column.key === 'star'">
                  <a-rate :value="record.star" disabled size="small" />
                </template>

                <template v-if="column.key === 'action'">
                  <a-space>
                    <a-button type="link" size="small" @click="viewFundDetail(record)">详情</a-button>
                    <a-button type="link" size="small" @click="addToPool(record)">加入备选</a-button>
                  </a-space>
                </template>
              </template>
            </a-table>
          </a-card>
        </a-col>
      </a-row>
    </div>

    <!-- ========== 指标分析模块 ========== -->
    <div v-if="activeTab === 'analysis'" class="tab-content">
      <a-row :gutter="16">
        <a-col :span="24">
          <a-card title="基金量化指标对比分析" class="panel-card">
            <template #extra>
              <a-select v-model:value="analysisFunds" mode="multiple" style="width: 300px" placeholder="选择基金进行对比">
                <a-select-option v-for="fund in fundPool" :key="fund.code" :value="fund.code">
                  {{ fund.name }}
                </a-select-option>
              </a-select>
            </template>

            <a-tabs>
              <a-tab-pane key="risk_return" tab="风险收益">
                <a-row :gutter="16">
                  <a-col :span="12">
                    <div ref="riskReturnChartRef" class="chart-container"></div>
                  </a-col>
                  <a-col :span="12">
                    <div ref="efficientFrontierRef" class="chart-container"></div>
                  </a-col>
                </a-row>
              </a-tab-pane>

              <a-tab-pane key="performance" tab="业绩归因">
                <div ref="attributionChartRef" class="chart-container"></div>
              </a-tab-pane>

              <a-tab-pane key="correlation" tab="相关性矩阵">
                <div ref="correlationChartRef" class="chart-container"></div>
              </a-tab-pane>
            </a-tabs>
          </a-card>
        </a-col>
      </a-row>
    </div>

    <!-- ========== 组合构建模块 ========== -->
    <div v-if="activeTab === 'portfolio'" class="tab-content">
      <a-row :gutter="16">
        <!-- 组合配置 -->
        <a-col :xs="24" :lg="8">
          <a-card title="组合配置" class="panel-card">
            <a-form :model="portfolioConfig" layout="vertical">
              <a-form-item label="组合名称">
                <a-input v-model:value="portfolioConfig.name" placeholder="我的基金组合" />
              </a-form-item>

              <a-form-item>
                <template #label>
                  <a-tooltip title="投资目标决定组合的风险收益特征">
                    <span>投资目标 <InfoCircleOutlined /></span>
                  </a-tooltip>
                </template>
                <a-select v-model:value="portfolioConfig.goal">
                  <a-select-option value="conservative">保守型 - 稳健增值</a-select-option>
                  <a-select-option value="balanced">平衡型 - 攻守兼备</a-select-option>
                  <a-select-option value="aggressive">进取型 - 追求收益</a-select-option>
                </a-select>
              </a-form-item>

              <a-form-item>
                <template #label>
                  <a-tooltip title="配置策略决定基金权重分配方式">
                    <span>配置策略 <InfoCircleOutlined /></span>
                  </a-tooltip>
                </template>
                <a-select v-model:value="portfolioConfig.strategy">
                  <a-select-option value="equal">等权重配置</a-select-option>
                  <a-select-option value="risk_parity">风险平价配置</a-select-option>
                  <a-select-option value="mean_variance">均值方差优化</a-select-option>
                  <a-select-option value="max_sharpe">最大夏普比率</a-select-option>
                  <a-select-option value="custom">自定义权重</a-select-option>
                </a-select>
              </a-form-item>

              <a-form-item>
                <template #label>
                  <a-tooltip title="最大回撤限制，控制组合风险">
                    <span>风险控制 - 最大回撤 <InfoCircleOutlined /></span>
                  </a-tooltip>
                </template>
                <a-slider v-model:value="portfolioConfig.maxDrawdown" :min="5" :max="30" />
                <span class="slider-label">{{ portfolioConfig.maxDrawdown }}%</span>
              </a-form-item>

              <a-divider />

              <div class="selected-funds">
                <div class="section-title">已选基金 ({{ selectedFundsForPortfolio.length }})</div>
                <div v-for="fund in selectedFundsForPortfolio" :key="fund.code" class="selected-fund-item">
                  <div class="fund-info">
                    <span class="fund-name">{{ fund.name }}</span>
                    <span class="fund-weight" v-if="portfolioConfig.strategy === 'custom'">
                      <a-input-number v-model:value="fund.weight" :min="0" :max="100" addon-after="%" size="small" />
                    </span>
                    <span class="fund-weight" v-else>{{ fund.weight }}%</span>
                  </div>
                  <a-button type="link" danger size="small" @click="removeFromPortfolio(fund)">删除</a-button>
                </div>

                <a-empty v-if="selectedFundsForPortfolio.length === 0" description="请从基金池中选择基金" />
              </div>

              <a-button 
                type="primary" 
                block 
                size="large" 
                @click="optimizePortfolio" 
                :disabled="selectedFundsForPortfolio.length < 2"
                style="margin-top: 16px;"
              >
                <CalculatorOutlined /> 优化配置
              </a-button>
            </a-form>
          </a-card>
        </a-col>

        <!-- 组合预览 -->
        <a-col :xs="24" :lg="16">
          <a-card title="组合预览" class="panel-card">
            <a-row :gutter="16">
              <a-col :span="12">
                <div ref="portfolioPieChartRef" class="chart-container"></div>
              </a-col>
              <a-col :span="12">
                <div ref="portfolioBarChartRef" class="chart-container"></div>
              </a-col>
            </a-row>

            <a-divider />

            <a-descriptions title="组合特征" bordered :column="3">
              <a-descriptions-item label="预期年化收益">{{ formatPercent(portfolioMetrics.expectedReturn) }}</a-descriptions-item>
              <a-descriptions-item label="预期波动率">{{ formatPercent(portfolioMetrics.volatility) }}</a-descriptions-item>
              <a-descriptions-item label="夏普比率">{{ portfolioMetrics.sharpe.toFixed(2) }}</a-descriptions-item>
              <a-descriptions-item label="最大回撤">{{ formatPercent(portfolioMetrics.maxDrawdown) }}</a-descriptions-item>
              <a-descriptions-item label="Beta">{{ portfolioMetrics.beta.toFixed(2) }}</a-descriptions-item>
              <a-descriptions-item label="基金数量">{{ selectedFundsForPortfolio.length }} 只</a-descriptions-item>
            </a-descriptions>
          </a-card>
        </a-col>
      </a-row>
    </div>

    <!-- ========== 回测验证模块 ========== -->
    <div v-if="activeTab === 'backtest'" class="tab-content">
      <a-row :gutter="16">
        <a-col :xs="24" :lg="6">
          <a-card title="回测参数" class="panel-card">
            <a-form :model="backtestConfig" layout="vertical">
              <a-form-item label="回测区间">
                <a-range-picker v-model:value="backtestConfig.dateRange" style="width: 100%" />
              </a-form-item>

              <a-form-item label="初始资金">
                <a-input-number 
                  v-model:value="backtestConfig.initialCapital" 
                  :formatter="value => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
                  :parser="value => value.replace(/\¥\s?|(,*)/g, '')"
                  style="width: 100%"
                />
              </a-form-item>

              <a-form-item label="基准指数">
                <a-select v-model:value="backtestConfig.benchmark">
                  <a-select-option value="000300">沪深300</a-select-option>
                  <a-select-option value="000905">中证500</a-select-option>
                  <a-select-option value="000001">上证指数</a-select-option>
                  <a-select-option value="csi_fund">中证基金指数</a-select-option>
                </a-select>
              </a-form-item>

              <a-form-item label="调仓频率">
                <a-select v-model:value="backtestConfig.rebalance">
                  <a-select-option value="month">月度调仓</a-select-option>
                  <a-select-option value="quarter">季度调仓</a-select-option>
                  <a-select-option value="year">年度调仓</a-select-option>
                </a-select>
              </a-form-item>

              <a-form-item label="交易费率">
                <a-slider v-model:value="backtestConfig.feeRate" :min="0" :max="2" :step="0.05" />
                <span class="slider-label">{{ backtestConfig.feeRate }}%</span>
              </a-form-item>

              <a-button type="primary" block size="large" @click="runBacktest" :loading="backtestLoading">
                <PlayCircleOutlined /> 开始回测
              </a-button>
            </a-form>
          </a-card>

          <a-card title="回测结果" class="panel-card" style="margin-top: 16px;" v-if="backtestResult">
            <div class="metric-grid">
              <div class="metric-item">
                <div class="metric-label">累计收益</div>
                <div class="metric-value" :class="getReturnClass(backtestResult.totalReturn)">
                  {{ formatPercent(backtestResult.totalReturn) }}
                </div>
              </div>
              <div class="metric-item">
                <div class="metric-label">年化收益</div>
                <div class="metric-value" :class="getReturnClass(backtestResult.annualReturn)">
                  {{ formatPercent(backtestResult.annualReturn) }}
                </div>
              </div>
              <div class="metric-item">
                <div class="metric-label">夏普比率</div>
                <div class="metric-value">{{ backtestResult.sharpe.toFixed(2) }}</div>
              </div>
              <div class="metric-item">
                <div class="metric-label">最大回撤</div>
                <div class="metric-value text-down">{{ formatPercent(backtestResult.maxDrawdown) }}</div>
              </div>
              <div class="metric-item">
                <div class="metric-label">胜率</div>
                <div class="metric-value">{{ formatPercent(backtestResult.winRate) }}</div>
              </div>
              <div class="metric-item">
                <div class="metric-label">Calmar</div>
                <div class="metric-value">{{ backtestResult.calmar.toFixed(2) }}</div>
              </div>
            </div>
          </a-card>
        </a-col>

        <a-col :xs="24" :lg="18">
          <a-card title="回测图表" class="panel-card" :loading="backtestLoading">
            <div ref="backtestChartRef" class="chart-container-large"></div>
          </a-card>

          <a-row :gutter="16" style="margin-top: 16px;">
            <a-col :span="12">
              <a-card title="月度收益分布">
                <div ref="monthlyReturnChartRef" class="chart-container"></div>
              </a-card>
            </a-col>
            <a-col :span="12">
              <a-card title="回撤分析">
                <div ref="drawdownChartRef" class="chart-container"></div>
              </a-card>
            </a-col>
          </a-row>
        </a-col>
      </a-row>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { message } from 'ant-design-vue'
import * as echarts from 'echarts'
import dayjs from 'dayjs'
import {
  FundOutlined, FilterOutlined, BarChartOutlined, PieChartOutlined, LineChartOutlined,
  SearchOutlined, InfoCircleOutlined, CalculatorOutlined, PlayCircleOutlined,
  EyeOutlined, DeleteOutlined
} from '@ant-design/icons-vue'

const activeTab = ref('screening')

// ========== 基金筛选 ==========
const screeningForm = ref({
  fundType: ['equity', 'hybrid'],
  establishYears: 3,
  scaleMin: 5,
  scaleMax: 500,
  managerYears: 2,
  sharpeMin: 0.5,
  sharpePeriod: '3y',
  drawdownMax: 20,
  drawdownPeriod: '3y',
  returnMin: 10,
  returnPeriod: '3y'
})

const fundColumns = [
  { title: '基金名称', key: 'name', width: 200 },
  { title: '近1年收益', key: 'return1y', width: 100, align: 'right' },
  { title: '近3年收益', key: 'return3y', width: 100, align: 'right' },
  { title: '夏普比率', key: 'sharpe', width: 100, align: 'right' },
  { title: '最大回撤', key: 'maxDrawdown', width: 100, align: 'right' },
  { title: '评级', key: 'star', width: 120 },
  { title: '操作', key: 'action', width: 150 }
]

const filteredFunds = ref([
  { code: '000001', name: '华夏成长混合', type: '混合型', return1y: 0.15, return3y: 0.45, sharpe: 1.2, maxDrawdown: -0.18, star: 4 },
  { code: '000002', name: '华夏大盘精选', type: '股票型', return1y: 0.22, return3y: 0.68, sharpe: 1.5, maxDrawdown: -0.22, star: 5 },
  { code: '161005', name: '富国天惠成长', type: '混合型', return1y: 0.18, return3y: 0.52, sharpe: 1.3, maxDrawdown: -0.15, star: 5 },
  { code: '001938', name: '中欧时代先锋', type: '股票型', return1y: 0.25, return3y: 0.72, sharpe: 1.6, maxDrawdown: -0.25, star: 5 },
  { code: '005827', name: '易方达蓝筹精选', type: '混合型', return1y: 0.12, return3y: 0.48, sharpe: 1.1, maxDrawdown: -0.28, star: 4 },
  { code: '260108', name: '景顺长城新兴', type: '股票型', return1y: 0.20, return3y: 0.58, sharpe: 1.4, maxDrawdown: -0.20, star: 4 }
])

const selectedFunds = ref([])
const fundPool = ref([])

const rowSelection = {
  onChange: (selectedRowKeys, selectedRows) => {
    selectedFunds.value = selectedRows
  }
}

const paginationConfig = { pageSize: 10, showSizeChanger: true, showTotal: total => `共 ${total} 条` }

const runScreening = () => {
  message.success('筛选完成')
}

const resetScreening = () => {
  screeningForm.value = {
    fundType: ['equity', 'hybrid'],
    establishYears: 3,
    scaleMin: 5,
    scaleMax: 500,
    managerYears: 2,
    sharpeMin: 0.5,
    sharpePeriod: '3y',
    drawdownMax: 20,
    drawdownPeriod: '3y',
    returnMin: 10,
    returnPeriod: '3y'
  }
}

const addToPool = (fund) => {
  if (!fundPool.value.find(f => f.code === fund.code)) {
    fundPool.value.push(fund)
    message.success(`已添加 ${fund.name} 到备选池`)
  }
}

const addAllToPool = () => {
  selectedFunds.value.forEach(fund => addToPool(fund))
}

const exportResults = () => {
  message.success('导出成功')
}

const viewFundDetail = (fund) => {
  message.info(`查看 ${fund.name} 详情`)
}

// ========== 组合构建 ==========
const portfolioConfig = ref({
  name: '我的基金组合',
  goal: 'balanced',
  strategy: 'risk_parity',
  maxDrawdown: 15
})

const selectedFundsForPortfolio = ref([
  { code: '000002', name: '华夏大盘精选', weight: 25 },
  { code: '161005', name: '富国天惠成长', weight: 25 },
  { code: '001938', name: '中欧时代先锋', weight: 25 },
  { code: '260108', name: '景顺长城新兴', weight: 25 }
])

const portfolioMetrics = ref({
  expectedReturn: 0.18,
  volatility: 0.22,
  sharpe: 0.82,
  maxDrawdown: -0.15,
  beta: 0.95
})

const removeFromPortfolio = (fund) => {
  selectedFundsForPortfolio.value = selectedFundsForPortfolio.value.filter(f => f.code !== fund.code)
}

const optimizePortfolio = () => {
  message.success('组合优化完成')
}

// ========== 回测 ==========
const backtestConfig = ref({
  dateRange: [dayjs().subtract(3, 'year'), dayjs()],
  initialCapital: 1000000,
  benchmark: '000300',
  rebalance: 'quarter',
  feeRate: 0.15
})

const backtestLoading = ref(false)
const backtestResult = ref(null)

const runBacktest = () => {
  backtestLoading.value = true
  setTimeout(() => {
    backtestResult.value = {
      totalReturn: 0.52,
      annualReturn: 0.15,
      sharpe: 0.95,
      maxDrawdown: -0.18,
      winRate: 0.65,
      calmar: 0.83
    }
    backtestLoading.value = false
    nextTick(() => initCharts())
  }, 1500)
}

// ========== 图表 ==========
const riskReturnChartRef = ref(null)
const efficientFrontierRef = ref(null)
const attributionChartRef = ref(null)
const correlationChartRef = ref(null)
const portfolioPieChartRef = ref(null)
const portfolioBarChartRef = ref(null)
const backtestChartRef = ref(null)
const monthlyReturnChartRef = ref(null)
const drawdownChartRef = ref(null)

const formatPercent = (value) => {
  if (value == null) return '--'
  const num = parseFloat(value)
  if (isNaN(num)) return '--'
  return `${num >= 0 ? '+' : ''}${(num * 100).toFixed(2)}%`
}

const getReturnClass = (value) => {
  const num = parseFloat(value)
  if (isNaN(num)) return ''
  return num >= 0 ? 'text-up' : 'text-down'
}

const handleTableChange = (pagination, filters, sorter) => {
  console.log(pagination, filters, sorter)
}

const initCharts = () => {
  // 风险收益散点图
  if (riskReturnChartRef.value) {
    echarts.init(riskReturnChartRef.value).setOption({
      title: { text: '风险收益分布', left: 'center' },
      tooltip: { trigger: 'item', formatter: '{b}: 收益 {c[1]}%, 波动 {c[0]}%' },
      xAxis: { type: 'value', name: '波动率(%)', min: 0 },
      yAxis: { type: 'value', name: '收益率(%)' },
      series: [{
        type: 'scatter',
        data: [
          [18, 15, '华夏成长'], [22, 22, '华夏大盘'], [15, 18, '富国天惠'],
          [25, 25, '中欧先锋'], [28, 12, '易方达蓝筹'], [20, 20, '景顺长城']
        ],
        symbolSize: 20,
        itemStyle: { color: '#1890ff' }
      }]
    })
  }

  // 有效前沿
  if (efficientFrontierRef.value) {
    echarts.init(efficientFrontierRef.value).setOption({
      title: { text: '有效前沿', left: 'center' },
      xAxis: { type: 'value', name: '波动率(%)' },
      yAxis: { type: 'value', name: '预期收益(%)' },
      series: [
        { type: 'line', data: [[10, 8], [12, 10], [15, 12], [18, 14], [22, 15]], smooth: true, name: '有效前沿' },
        { type: 'scatter', data: [[18, 14]], symbolSize: 15, itemStyle: { color: '#f5222d' }, name: '最优组合' }
      ]
    })
  }

  // 组合饼图
  if (portfolioPieChartRef.value) {
    echarts.init(portfolioPieChartRef.value).setOption({
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        data: [
          { name: '华夏大盘精选', value: 25 },
          { name: '富国天惠成长', value: 25 },
          { name: '中欧时代先锋', value: 25 },
          { name: '景顺长城新兴', value: 25 }
        ]
      }]
    })
  }

  // 回测收益曲线
  if (backtestChartRef.value) {
    echarts.init(backtestChartRef.value).setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['组合收益', '基准收益'] },
      xAxis: { type: 'category', data: ['2021', '2022', '2023', '2024'] },
      yAxis: { type: 'value', name: '累计收益(%)' },
      series: [
        { name: '组合收益', type: 'line', data: [10, 25, 45, 68], smooth: true },
        { name: '基准收益', type: 'line', data: [8, 15, 28, 42], smooth: true, lineStyle: { type: 'dashed' } }
      ]
    })
  }
}

onMounted(() => {
  nextTick(() => initCharts())
})

watch(activeTab, () => {
  nextTick(() => initCharts())
})
</script>

<style scoped lang="less">
.fund-model-container {
  .header-card {
    margin-bottom: 16px;
    background: linear-gradient(135deg, #f6ffed 0%, #fff 100%);
    
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      
      .title-section {
        display: flex;
        align-items: center;
        gap: 16px;
        
        .title-icon {
          font-size: 36px;
          color: #52c41a;
        }
        
        .title-text {
          h1 {
            margin: 0;
            font-size: 22px;
            font-weight: 700;
            color: #262626;
          }
          
          .subtitle {
            color: #8c8c8c;
            font-size: 13px;
          }
        }
      }
    }
  }

  .tab-content {
    animation: fadeIn 0.4s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .panel-card {
    height: 100%;
  }

  .slider-label {
    float: right;
    color: #1890ff;
    font-weight: 500;
  }

  .text-up {
    color: #f5222d;
  }

  .text-down {
    color: #52c41a;
  }

  .fund-name-cell {
    .fund-name {
      font-weight: 500;
      font-size: 14px;
    }
    
    .fund-code {
      font-size: 12px;
      color: #8c8c8c;
    }
  }

  .selected-funds {
    .section-title {
      font-weight: 600;
      margin-bottom: 12px;
      font-size: 14px;
    }

    .selected-fund-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: #f6ffed;
      border-radius: 6px;
      margin-bottom: 8px;

      .fund-info {
        display: flex;
        align-items: center;
        gap: 12px;

        .fund-name {
          font-weight: 500;
        }

        .fund-weight {
          color: #1890ff;
          font-weight: 600;
        }
      }
    }
  }

  .metric-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;

    .metric-item {
      text-align: center;
      padding: 16px;
      background: #f6ffed;
      border-radius: 8px;

      .metric-label {
        font-size: 12px;
        color: #8c8c8c;
        margin-bottom: 4px;
      }

      .metric-value {
        font-size: 24px;
        font-weight: 700;
      }
    }
  }

  .chart-container {
    height: 300px;
  }

  .chart-container-large {
    height: 400px;
  }
}

html[data-theme='dark'] {
  .fund-model-container {
    .header-card {
      background: linear-gradient(135deg, rgba(82, 196, 26, 0.1) 0%, #1a1a1a 100%);
    }

    .selected-fund-item {
      background: rgba(82, 196, 26, 0.1);
    }

    .metric-item {
      background: rgba(82, 196, 26, 0.1);
    }
  }
}
</style>
