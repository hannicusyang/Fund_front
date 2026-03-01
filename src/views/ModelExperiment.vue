<template>
  <div class="model-experiment-container">
    <!-- 顶部导航 - 选择实验类型 -->
    <a-card :bordered="false" class="header-card">
      <div class="header-content">
        <div class="title-section">
          <ExperimentOutlined class="title-icon" />
          <div class="title-text">
            <h1>模型实验室</h1>
            <span class="subtitle">量化投资策略研究与回测验证平台</span>
          </div>
        </div>
        <a-radio-group v-model:value="experimentType" button-style="solid" size="large">
          <a-radio-button value="fund">
            <FundOutlined /> 基金投资模型
          </a-radio-button>
          <a-radio-button value="stock">
            <StockOutlined /> 股票投资模型
          </a-radio-button>
        </a-radio-group>
      </div>
    </a-card>

    <!-- ========== 第一部分：基金投资模型实验 ========== -->
    <div v-if="experimentType === 'fund'" class="experiment-section">
      <!-- 基金模型子导航 -->
      <a-card class="sub-nav-card">
        <a-radio-group v-model:value="fundActiveTab" button-style="solid">
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
      </a-card>

      <!-- 基金筛选模块 -->
      <div v-if="fundActiveTab === 'screening'" class="tab-content">
        <FundScreening
          :fund-pool="fundPool"
          @select-fund="onSelectFund"
          @add-to-pool="addToPool"
          @remove-from-pool="removeFromPool"
          @clear-pool="clearPool"
          @go-to-tab="switchTab"
        />
      </div>

      <!-- 指标分析模块 -->
      <div v-if="fundActiveTab === 'analysis'" class="tab-content">
        <FundAnalysis :fund-pool="fundPool" />
      </div>

      <!-- 组合构建模块 -->
      <div v-if="fundActiveTab === 'portfolio'" class="tab-content">
        <FundPortfolio 
          :fund-pool="fundPool"
          :my-holdings="myFundHoldings"
          @save-portfolio="savePortfolio"
        />
      </div>

      <!-- 回测验证模块 -->
      <div v-if="fundActiveTab === 'backtest'" class="tab-content">
        <FundBacktest 
          :fund-pool="fundPool"
          :fund-nav-history="fundNavHistory"
        />
      </div>
    </div>

    <!-- ========== 第二部分：股票投资模型实验 ========== -->
    <div v-if="experimentType === 'stock'" class="experiment-section">
      <!-- 股票模型子导航 -->
      <a-card class="sub-nav-card">
        <a-radio-group v-model:value="stockActiveTab" button-style="solid">
          <a-radio-button value="screening">
            <FilterOutlined /> 多因子选股
          </a-radio-button>
          <a-radio-button value="analysis">
            <BarChartOutlined /> 技术分析
          </a-radio-button>
          <a-radio-button value="portfolio">
            <PieChartOutlined /> 组合构建
          </a-radio-button>
          <a-radio-button value="backtest">
            <LineChartOutlined /> 策略回测
          </a-radio-button>
        </a-radio-group>
      </a-card>

      <!-- 多因子选股模块 -->
      <div v-if="stockActiveTab === 'screening'" class="tab-content">
        <StockScreeningPro 
          @go-to-portfolio="switchToPortfolio"
        />
      </div>

      <!-- 技术分析模块 -->
      <div v-if="stockActiveTab === 'analysis'" class="tab-content">
        <StockAnalysis />
      </div>

      <!-- 组合构建模块 -->
      <div v-if="stockActiveTab === 'portfolio'" class="tab-content">
        <StockPortfolio />
      </div>

      <!-- 策略回测模块 -->
      <div v-if="stockActiveTab === 'backtest'" class="tab-content">
        <StockBacktestPro />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import {
  ExperimentOutlined, FundOutlined, StockOutlined,
  FilterOutlined, BarChartOutlined, PieChartOutlined, LineChartOutlined,
  RadarChartOutlined, RobotOutlined
} from '@ant-design/icons-vue'

// 子组件导入
import FundScreening from '@/components/model/fund/FundScreening.vue'
import FundAnalysis from '@/components/model/fund/FundAnalysis.vue'
import FundPortfolio from '@/components/model/fund/FundPortfolio.vue'
import FundBacktest from '@/components/model/fund/FundBacktest.vue'
import StockScreeningPro from '@/components/model/stock/StockScreeningPro.vue'
import StockAnalysis from '@/components/model/stock/StockAnalysis.vue'
import StockPortfolio from '@/components/model/stock/StockPortfolio.vue'
import StockBacktestPro from '@/components/model/stock/StockBacktestPro.vue'

// 导入API
import { fundApi } from '@/api/fund.js'
import { fundScreeningApi, fundAnalysisApi, fundPortfolioApi } from '@/api/fundModel.js'

// 当前实验类型
const experimentType = ref('fund')
const fundActiveTab = ref('screening')
const stockActiveTab = ref('screening')

// 数据存储
const fundList = ref([])
const fundRank = ref([])
const fundNavHistory = ref([])
const fundEstimation = ref([])
const fundHoldings = ref([])
const fundPool = ref([])
const myFundHoldings = ref([])
const fundWatchlist = ref([])
const loading = ref(false)

// 切换到组合构建页面
const switchToPortfolio = () => {
  stockActiveTab.value = 'portfolio'
}

// 加载真实数据
onMounted(async () => {
  loading.value = true
  try {
    // 并行加载多个接口的数据
    const [holdingRes, watchlistRes, portfolioRes] = await Promise.all([
      // 我的持仓
      fundApi.getMyHolding(),
      // 关注列表
      fundApi.getWatchlist ? fundApi.getWatchlist() : Promise.resolve({ data: [] }),
      // 组合净值历史
      fundApi.getPortfolioHistory(30)
    ])
    
    // 处理持仓数据
    if (holdingRes?.data) {
      myFundHoldings.value = holdingRes.data || []
      fundHoldings.value = holdingRes.data || []
    }
    
    // 处理关注列表
    if (watchlistRes?.data) {
      fundWatchlist.value = watchlistRes.data || []
    }
    
    // 处理组合净值历史
    if (portfolioRes?.data) {
      fundNavHistory.value = portfolioRes.data || []
    }
    
    // 获取基金排名/列表
    try {
      const fundListRes = await fundScreeningApi.screenFunds({ page: 1, page_size: 20 })
      if (fundListRes?.data?.funds) {
        fundList.value = fundListRes.data.funds
        fundRank.value = fundListRes.data.funds
      }
    } catch (e) {
      console.warn('基金列表加载失败:', e)
    }
    
    // 如果没有持仓数据，显示空状态提示
    if (myFundHoldings.value.length === 0) {
      message.info('暂无持仓数据，请先添加基金到持仓')
    } else {
      message.success('数据加载完成')
    }
  } catch (error) {
    console.error('数据加载失败:', error)
    message.error('数据加载失败: ' + error.message)
  } finally {
    loading.value = false
  }
})

// 选择基金
function onSelectFund(fund) {
  console.log('选择基金:', fund)
}

// 添加到备选池
function addToPool(fund) {
  if (!fundPool.value.find(f => f.fund_code === fund.fund_code)) {
    fundPool.value.push(fund)
    message.success(`已添加 ${fund.fund_name} 到备选池`)
  } else {
    message.warning('该基金已在备选池中')
  }
}

// 从备选池移除
function removeFromPool(fundCode) {
  const index = fundPool.value.findIndex(f => f.fund_code === fundCode)
  if (index > -1) {
    fundPool.value.splice(index, 1)
  }
}

// 清空备选池
function clearPool() {
  fundPool.value = []
  message.info('备选池已清空')
}

// 切换标签页
function switchTab(tabName) {
  fundActiveTab.value = tabName
}

// 保存投资组合
function savePortfolio(portfolio) {
  console.log('保存组合:', portfolio)
  message.success('组合保存成功')
}
</script>

<style scoped lang="less">
.model-experiment-container {
  padding: 16px;

  .header-card {
    margin-bottom: 16px;
    background: linear-gradient(135deg, #e6f7ff 0%, #fff 100%);

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
          font-size: 40px;
          color: #1890ff;
        }

        .title-text {
          h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
            color: #262626;
          }

          .subtitle {
            color: #8c8c8c;
            font-size: 14px;
          }
        }
      }
    }
  }

  .sub-nav-card {
    margin-bottom: 16px;
    text-align: center;
  }

  .experiment-section {
    animation: fadeIn 0.4s ease;
  }

  .tab-content {
    animation: slideUp 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .stock-preview {
    margin-top: 24px;
    text-align: left;

    h3 {
      margin-bottom: 16px;
      color: #262626;
    }

    .feature-icon {
      font-size: 32px;
      color: #1890ff;
      margin-bottom: 12px;
    }

    h4 {
      margin: 8px 0;
      color: #262626;
    }

    p {
      color: #8c8c8c;
      font-size: 13px;
    }
  }
}

/* 移动端适配 */
@media (max-width: 768px) {
  .model-experiment-container {
    padding: 8px;
  }
  
  /* header card */
  .header-card {
    margin-bottom: 12px;
  }
  .header-card .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  /* 标题区域 */
  .title-section {
    margin-bottom: 0;
    width: 100%;
  }
  .title-section .title-icon {
    font-size: 28px;
  }
  .title-section .title-text h1 {
    font-size: 18px;
  }
  .title-section .title-text .subtitle {
    font-size: 12px;
  }
  
  /* radio 按钮 - 主导航 */
  :deep(.ant-radio-group) {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    width: 100%;
  }
  :deep(.ant-radio-button-wrapper) {
    padding: 4px 10px;
    font-size: 12px;
    flex: 1;
    text-align: center;
    min-width: 80px;
  }
  
  /* 子导航卡片 */
  .sub-nav-card {
    margin-bottom: 12px;
    padding: 8px;
  }
  :deep(.sub-nav-card .ant-radio-group) {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  :deep(.sub-nav-card .ant-radio-button-wrapper) {
    padding: 4px 8px;
    font-size: 11px;
    flex: 1;
    text-align: center;
    min-width: 60px;
  }
  
  /* 内容区 */
  .tab-content {
    padding: 4px;
  }
  
  /* 卡片移动端样式 */
  :deep(.ant-card) {
    margin-bottom: 12px;
    border-radius: 8px;
  }
  :deep(.ant-card-head) {
    padding: 12px 16px;
    min-height: auto;
  }
  :deep(.ant-card-head-title) {
    padding: 0;
    font-size: 14px;
  }
  :deep(.ant-card-body) {
    padding: 12px;
  }
}

/* 超小屏幕 */
@media (max-width: 576px) {
  .model-experiment-container {
    padding: 4px;
  }
  
  .title-section .title-icon {
    font-size: 24px;
  }
  .title-section .title-text h1 {
    font-size: 16px;
  }
  
  /* radio 按钮更小 */
  :deep(.ant-radio-button-wrapper) {
    padding: 3px 6px;
    font-size: 11px;
    min-width: 60px;
  }
  
  :deep(.sub-nav-card .ant-radio-button-wrapper) {
    padding: 3px 4px;
    font-size: 10px;
    min-width: 50px;
  }
  
  .tab-content {
    padding: 2px;
  }
}
</style>
