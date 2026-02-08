<template>
  <div class="model-experiment-container">
    <!-- 顶部导航 - 选择实验类型 -->
    <a-card :bordered="false" class="header-card">
      <div class="header-content">
        <div class="title-section">
          <ExperimentOutlined class="title-icon" />
          <div class="title-text">
            <h1>模型实验实验室</h1>
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
          :fund-list="fundList"
          :fund-rank="fundRank"
          @select-fund="onSelectFund"
          @add-to-pool="addToPool"
        />
      </div>

      <!-- 指标分析模块 -->
      <div v-if="fundActiveTab === 'analysis'" class="tab-content">
        <FundAnalysis 
          :fund-pool="fundPool"
          :fund-nav-history="fundNavHistory"
        />
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

    <!-- ========== 第二部分：股票投资模型实验（二期开发） ========== -->
    <div v-if="experimentType === 'stock'" class="experiment-section">
      <a-result
        status="info"
        title="股票投资模型实验"
        sub-title="该模块为二期开发内容，敬请期待"
      >
        <template #extra>
          <a-button type="primary" @click="experimentType = 'fund'">
            返回基金模型
          </a-button>
        </template>
        <div class="stock-preview">
          <h3>规划功能预览：</h3>
          <a-row :gutter="16">
            <a-col :span="8">
              <a-card>
                <RadarChartOutlined class="feature-icon" />
                <h4>多因子选股模型</h4>
                <p>基于估值、动量、质量等多维度因子构建选股策略</p>
              </a-card>
            </a-col>
            <a-col :span="8">
              <a-card>
                <LineChartOutlined class="feature-icon" />
                <h4>技术分析策略</h4>
                <p>支持均线、MACD、RSI等技术指标策略回测</p>
              </a-card>
            </a-col>
            <a-col :span="8">
              <a-card>
                <RobotOutlined class="feature-icon" />
                <h4>机器学习预测</h4>
                <p>利用LSTM、XGBoost等模型预测股价走势</p>
              </a-card>
            </a-col>
          </a-row>
        </div>
      </a-result>
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

// 当前实验类型
const experimentType = ref('fund')
const fundActiveTab = ref('screening')

// 数据存储
const fundList = ref([])
const fundRank = ref([])
const fundNavHistory = ref([])
const fundEstimation = ref([])
const fundHoldings = ref([])
const fundPool = ref([])
const myFundHoldings = ref([])
const fundWatchlist = ref([])

// API基础URL（Flask后端）
const API_BASE = '/api'

// 加载 fund_db 数据
onMounted(async () => {
  try {
    // 加载基金排名列表
    const fundRankRes = await fetch(`${API_BASE}/funds/list?page=1&page_size=10000`)
    const fundRankData = await fundRankRes.json()
    fundRank.value = fundRankData.data?.items || []
    
    // 加载我的持仓
    const myHoldRes = await fetch(`${API_BASE}/holding/my-holdings`)
    const myHoldData = await myHoldRes.json()
    myFundHoldings.value = myHoldData.data || []
    
    // 加载关注列表
    const watchRes = await fetch(`${API_BASE}/watchlist/my-watchlist`)
    const watchData = await watchRes.json()
    fundWatchlist.value = watchData.data || []
    
    // 从排名数据中提取基金基本信息
    fundList.value = fundRank.value.map(fund => ({
      fund_code: fund.fund_code,
      fund_name: fund.fund_name,
      fund_type: fund.fund_type || ''
    }))
    
    message.success('数据加载完成')
  } catch (error) {
    console.error('数据加载失败:', error)
    message.error('数据加载失败，请检查后端服务')
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
</style>
