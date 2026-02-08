<template>
  <div class="model-lab-container">
    <!-- 顶部导航 -->
    <a-card :bordered="false" class="lab-header">
      <div class="header-main">
        <div class="title-section">
          <ExperimentOutlined class="lab-icon" />
          <div class="title-content">
            <h1>QuantLab Pro</h1>
            <span class="subtitle">专业级量化基金研究平台</span>
          </div>
        </div>
        <a-radio-group v-model:value="activeModule" button-style="solid" size="large">
          <a-radio-button value="factor">
            <ApartmentOutlined /> 多因子研究
          </a-radio-button>
          <a-radio-button value="smartbeta">
            <ThunderboltOutlined /> Smart Beta
          </a-radio-button>
          <a-radio-button value="ml">
            <RobotOutlined /> AI/ML策略
          </a-radio-button>
          <a-radio-button value="allocation">
            <PieChartOutlined /> 资产配置
          </a-radio-button>
          <a-radio-button value="risk">
            <SafetyOutlined /> 风险管理
          </a-radio-button>
        </a-radio-group>
      </div>
    </a-card>

    <!-- ========== 多因子研究模块 ========== -->
    <div v-if="activeModule === 'factor'" class="module-content">
      <a-row :gutter="16">
        <!-- 因子配置面板 -->
        <a-col :xs="24" :xl="8">
          <a-card title="因子暴露配置" class="panel-card">
            <template #extra>
              <a-button type="link" @click="resetFactorExposure">重置</a-button>
            </template>
            
            <div class="factor-category" v-for="category in factorCategories" :key="category.key">
              <div class="category-header">
                <span class="category-name">{{ category.name }}</span>
                <a-tag :color="category.color">{{ getCategoryExposure(category) }}%</a-tag>
              </div>
              <div class="factor-list">
                <div v-for="factor in category.factors" :key="factor.key" class="factor-row" :class="{ active: factor.weight !== 0 }">
                  <div class="factor-label">
                    <a-tooltip :title="factor.description">
                      <span class="term-name">{{ factor.name }} <InfoCircleOutlined class="info-icon" /></span>
                    </a-tooltip>
                  </div>
                  <div class="factor-control">
                    <a-slider v-model:value="factor.weight" :min="-1" :max="1" :step="0.05" class="exposure-slider" />
                    <a-input-number 
                      v-model:value="factor.weight" 
                      :min="-1" 
                      :max="1" 
                      :step="0.05" 
                      class="exposure-input"
                      :formatter="value => value > 0 ? `+${value}` : value"
                    />
                  </div>
                </div>
              </div>
            </div>
          </a-card>

          <a-card title="Barra风险模型" class="panel-card mt-16">
            <a-descriptions :column="1" size="small">
              <a-descriptions-item>
                <template #label>
                  <a-tooltip title="市值因子：小市值股票 historically 有超额收益">
                    <span>Size <InfoCircleOutlined /></span>
                  </a-tooltip>
                </template>
                <div class="slider-input-group">
                  <a-slider v-model:value="barraFactors.size" :min="0" :max="1" :step="0.05" class="barra-slider" />
                  <a-input-number v-model:value="barraFactors.size" :min="0" :max="1" :step="0.05" class="barra-input" />
                </div>
              </a-descriptions-item>
              <a-descriptions-item>
                <template #label>
                  <a-tooltip title="价值因子：低市净率、低市盈率的股票">
                    <span>Value <InfoCircleOutlined /></span>
                  </a-tooltip>
                </template>
                <div class="slider-input-group">
                  <a-slider v-model:value="barraFactors.value" :min="0" :max="1" :step="0.05" class="barra-slider" />
                  <a-input-number v-model:value="barraFactors.value" :min="0" :max="1" :step="0.05" class="barra-input" />
                </div>
              </a-descriptions-item>
              <a-descriptions-item>
                <template #label>
                  <a-tooltip title="动量因子：过去表现好的股票倾向于继续上涨">
                    <span>Momentum <InfoCircleOutlined /></span>
                  </a-tooltip>
                </template>
                <div class="slider-input-group">
                  <a-slider v-model:value="barraFactors.momentum" :min="0" :max="1" :step="0.05" class="barra-slider" />
                  <a-input-number v-model:value="barraFactors.momentum" :min="0" :max="1" :step="0.05" class="barra-input" />
                </div>
              </a-descriptions-item>
              <a-descriptions-item>
                <template #label>
                  <a-tooltip title="质量因子：高ROE、低杠杆、盈利稳定的股票">
                    <span>Quality <InfoCircleOutlined /></span>
                  </a-tooltip>
                </template>
                <div class="slider-input-group">
                  <a-slider v-model:value="barraFactors.quality" :min="0" :max="1" :step="0.05" class="barra-slider" />
                  <a-input-number v-model:value="barraFactors.quality" :min="0" :max="1" :step="0.05" class="barra-input" />
                </div>
              </a-descriptions-item>
              <a-descriptions-item>
                <template #label>
                  <a-tooltip title="波动率因子：低波动股票通常有更好风险调整后收益">
                    <span>Volatility <InfoCircleOutlined /></span>
                  </a-tooltip>
                </template>
                <div class="slider-input-group">
                  <a-slider v-model:value="barraFactors.volatility" :min="0" :max="1" :step="0.05" class="barra-slider" />
                  <a-input-number v-model:value="barraFactors.volatility" :min="0" :max="1" :step="0.05" class="barra-input" />
                </div>
              </a-descriptions-item>
            </a-descriptions>
          </a-card>
        </a-col>

        <!-- 策略构建 -->
        <a-col :xs="24" :xl="10">
          <a-card title="策略参数" class="panel-card">
            <a-form :model="factorStrategy" layout="vertical">
              <a-form-item label="策略名称">
                <a-input v-model:value="factorStrategy.name" placeholder="例如：Barra纯多因子Alpha" />
              </a-form-item>

              <a-row :gutter="16">
                <a-col :span="12">
                  <a-form-item label="选股域">
                    <a-select v-model:value="factorStrategy.universe">
                      <a-select-option value="csi300">沪深300</a-select-option>
                      <a-select-option value="csi500">中证500</a-select-option>
                      <a-select-option value="csi800">中证800</a-select-option>
                      <a-select-option value="all">全市场</a-select-option>
                      <a-select-option value="fund_pool">基金优选池</a-select-option>
                    </a-select>
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="调仓频率">
                    <a-select v-model:value="factorStrategy.rebalance">
                      <a-select-option value="weekly">周度</a-select-option>
                      <a-select-option value="monthly">月度</a-select-option>
                      <a-select-option value="quarterly">季度</a-select-option>
                    </a-select>
                  </a-form-item>
                </a-col>
              </a-row>

              <a-row :gutter="16">
                <a-col :span="12">
                  <a-form-item label="持仓数量">
                    <a-input-number v-model:value="factorStrategy.holdings" :min="10" :max="100" style="width: 100%" />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="加权方式">
                    <a-select v-model:value="factorStrategy.weighting">
                      <a-select-option value="equal">等权</a-select-option>
                      <a-select-option value="score">因子得分加权</a-select-option>
                      <a-select-option value="cap">市值加权</a-select-option>
                      <a-select-option value="risk_parity">风险平价</a-select-option>
                    </a-select>
                  </a-form-item>
                </a-col>
              </a-row>

              <a-form-item>
                <template #label>
                  <a-tooltip title="消除特定因子暴露，使组合只对目标因子有纯暴露">
                    <span>中性化设置 <InfoCircleOutlined /></span>
                  </a-tooltip>
                </template>
                <a-checkbox-group v-model:value="factorStrategy.neutralize">
                  <a-checkbox value="industry">
                    <a-tooltip title="组合在各行业权重与基准保持一致，消除行业轮动影响">行业中性</a-tooltip>
                  </a-checkbox>
                  <a-checkbox value="market_cap">
                    <a-tooltip title="组合市值分布与基准一致，消除大小盘风格影响">市值中性</a-tooltip>
                  </a-checkbox>
                  <a-checkbox value="beta">
                    <a-tooltip title="组合Beta接近1，消除市场系统性风险暴露">Beta中性</a-tooltip>
                  </a-checkbox>
                </a-checkbox-group>
              </a-form-item>

              <a-form-item>
                <template #label>
                  <a-tooltip title="IC：信息系数，因子值与下期收益的相关系数；IR：信息比率，IC的均值除以标准差">
                    <span>IC/IR阈值 <InfoCircleOutlined /></span>
                  </a-tooltip>
                </template>
                <a-row :gutter="8">
                  <a-col :span="12">
                    <a-tooltip title="信息系数阈值：IC > 0.02 表示因子有一定预测能力">
                      <span class="input-label">IC ></span>
                    </a-tooltip>
                    <a-input-number v-model:value="factorStrategy.icThreshold" :min="0" :max="0.1" :step="0.01" />
                  </a-col>
                  <a-col :span="12">
                    <a-tooltip title="信息比率阈值：IR > 0.5 表示因子稳定且有效">
                      <span class="input-label">IR ></span>
                    </a-tooltip>
                    <a-input-number v-model:value="factorStrategy.irThreshold" :min="0" :max="1" :step="0.1" />
                  </a-col>
                </a-row>
              </a-form-item>
            </a-form>
          </a-card>

          <a-card title="因子IC分析" class="panel-card mt-16">
            <div ref="icChartRef" class="ic-chart"></div>
          </a-card>
        </a-col>

        <!-- 结果预览 -->
        <a-col :xs="24" :xl="6">
          <a-card title="策略预览" class="panel-card preview-panel">
            <div class="preview-section">
              <div class="section-title">因子暴露汇总</div>
              <div class="exposure-bars">
                <div v-for="cat in factorCategories" :key="cat.key" class="exposure-bar-item">
                  <span class="bar-label">{{ cat.shortName }}</span>
                  <div class="bar-track">
                    <div class="bar-fill" :style="{ width: getExposurePercent(cat) + '%', background: cat.color }"></div>
                  </div>
                  <span class="bar-value">{{ getCategoryExposure(cat) }}%</span>
                </div>
              </div>
            </div>

            <a-divider />

            <div class="preview-section">
              <div class="section-title">预期特征</div>
              <a-descriptions :column="1" size="small">
                <a-descriptions-item label="策略类型">多因子Alpha</a-descriptions-item>
                <a-descriptions-item label="预期波动">中等</a-descriptions-item>
                <a-descriptions-item label="Beta暴露">≈ 0.1</a-descriptions-item>
                <a-descriptions-item label="换手率">预计 50%/年</a-descriptions-item>
              </a-descriptions>
            </div>

            <a-divider />

            <div class="action-area">
              <a-button type="primary" block size="large" @click="runFactorBacktest">
                <PlayCircleOutlined /> 运行回测
              </a-button>
              <a-button block class="mt-8" @click="saveFactorStrategy">
                <SaveOutlined /> 保存策略
              </a-button>
            </div>
          </a-card>

          <a-card title="学术参考" class="panel-card mt-16">
            <a-collapse ghost>
              <a-collapse-panel header="Barra风险模型" key="1">
                <p>MSCI Barra多因子风险模型，将股票收益分解为共同因子和特质因子。</p>
              </a-collapse-panel>
              <a-collapse-panel header="Fama-French 5因子" key="2">
                <p>市场、规模、价值、盈利、投资风格因子。</p>
              </a-collapse-panel>
              <a-collapse-panel header="AQR因子投资" key="3">
                <p>价值、动量、carry、防御四大因子。</p>
              </a-collapse-panel>
            </a-collapse>
          </a-card>
        </a-col>
      </a-row>
    </div>

    <!-- ========== Smart Beta模块 ========== -->
    <div v-if="activeModule === 'smartbeta'" class="module-content">
      <a-row :gutter="16">
        <a-col :xs="24" :lg="8">
          <a-card title="Smart Beta策略" class="panel-card">
            <div class="strategy-grid">
              <div
                v-for="strategy in smartBetaStrategies"
                :key="strategy.key"
                class="strategy-card"
                :class="{ active: selectedSmartBeta === strategy.key }"
                @click="selectSmartBeta(strategy)"
              >
                <div class="strategy-icon">{{ strategy.icon }}</div>
                <div class="strategy-info">
                  <div class="strategy-name">{{ strategy.name }}</div>
                  <div class="strategy-desc">{{ strategy.description }}</div>
                </div>
              </div>
            </div>
          </a-card>
        </a-col>

        <a-col :xs="24" :lg="16">
          <a-card :title="selectedSmartBetaName" class="panel-card">
            <div v-if="selectedSmartBeta" class="strategy-detail">
              <a-descriptions :column="2" bordered>
                <a-descriptions-item label="构建逻辑">{{ currentSmartBeta.logic }}</a-descriptions-item>
                <a-descriptions-item label="加权方式">{{ currentSmartBeta.weighting }}</a-descriptions-item>
                <a-descriptions-item label="再平衡">{{ currentSmartBeta.rebalance }}</a-descriptions-item>
                <a-descriptions-item label="预期特征">{{ currentSmartBeta.feature }}</a-descriptions-item>
              </a-descriptions>

              <a-divider />

              <div ref="smartBetaChartRef" class="strategy-chart"></div>

              <div class="strategy-actions">
                <a-button type="primary" @click="runSmartBetaBacktest">回测此策略</a-button>
                <a-button @click="compareSmartBeta">多策略对比</a-button>
              </div>
            </div>

            <a-empty v-else description="请选择一个Smart Beta策略" />
          </a-card>
        </a-col>
      </a-row>
    </div>

    <!-- ========== AI/ML模块 ========== -->
    <div v-if="activeModule === 'ml'" class="module-content">
      <a-row :gutter="16">
        <a-col :xs="24" :xl="6">
          <a-card title="算法选择" class="panel-card">
            <a-radio-group v-model:value="mlConfig.algorithm" class="algorithm-list">
              <a-radio-button value="xgboost">
                <div class="algo-item">
                  <span class="algo-name">XGBoost</span>
                  <span class="algo-desc">梯度提升，高可解释性</span>
                </div>
              </a-radio-button>
              <a-radio-button value="lstm">
                <div class="algo-item">
                  <span class="algo-name">LSTM</span>
                  <span class="algo-desc">时序预测，捕捉趋势</span>
                </div>
              </a-radio-button>
              <a-radio-button value="transformer">
                <div class="algo-item">
                  <span class="algo-name">Transformer</span>
                  <span class="algo-desc">注意力机制，最新SOTA</span>
                </div>
              </a-radio-button>
              <a-radio-button value="ensemble">
                <div class="algo-item">
                  <span class="algo-name">集成学习</span>
                  <span class="algo-desc">多模型融合，稳健性强</span>
                </div>
              </a-radio-button>
            </a-radio-group>
          </a-card>

          <a-card title="模型参数" class="panel-card mt-16">
            <a-form :model="mlConfig" layout="vertical">
              <a-form-item label="特征维度">
                <a-select v-model:value="mlConfig.features" mode="multiple">
                  <a-select-option value="price">价格特征</a-select-option>
                  <a-select-option value="volume">成交量特征</a-select-option>
                  <a-select-option value="fundamental">基本面特征</a-select-option>
                  <a-select-option value="sentiment">舆情特征</a-select-option>
                  <a-select-option value="alternative">另类数据</a-select-option>
                </a-select>
              </a-form-item>
              <a-form-item label="预测周期">
                <a-select v-model:value="mlConfig.predictionHorizon">
                  <a-select-option :value="5">5天</a-select-option>
                  <a-select-option :value="10">10天</a-select-option>
                  <a-select-option :value="20">20天</a-select-option>
                  <a-select-option :value="60">60天</a-select-option>
                </a-select>
              </a-form-item>
              <a-form-item label="训练窗口">
                <a-slider v-model:value="mlConfig.trainWindow" :min="252" :max="1260" />
                <span>{{ mlConfig.trainWindow }} 天</span>
              </a-form-item>
            </a-form>
          </a-card>
        </a-col>

        <a-col :xs="24" :xl="12">
          <a-card title="特征重要性" class="panel-card">
            <div ref="featureImportanceRef" class="feature-chart"></div>
          </a-card>

          <a-card title="预测效果" class="panel-card mt-16">
            <a-row :gutter="16" class="ml-metrics">
              <a-col :span="8">
                <div class="ml-metric">
                  <div class="metric-value">0.72</div>
                  <div class="metric-label">准确率</div>
                </div>
              </a-col>
              <a-col :span="8">
                <div class="ml-metric">
                  <div class="metric-value">0.68</div>
                  <div class="metric-label">AUC</div>
                </div>
              </a-col>
              <a-col :span="8">
                <div class="ml-metric">
                  <div class="metric-value">0.15</div>
                  <div class="metric-label">特征IC</div>
                </div>
              </a-col>
            </a-row>
          </a-card>
        </a-col>

        <a-col :xs="24" :xl="6">
          <a-card title="模型输出" class="panel-card">
            <div class="prediction-list">
              <div v-for="(pred, i) in mlPredictions" :key="i" class="pred-item">
                <div class="pred-rank">{{ i + 1 }}</div>
                <div class="pred-info">
                  <div class="pred-name">{{ pred.name }}</div>
                  <div class="pred-code">{{ pred.code }}</div>
                </div>
                <div class="pred-score" :style="{ color: getScoreColor(pred.score) }">{{ pred.score }}</div>
              </div>
            </div>
          </a-card>
        </a-col>
      </a-row>
    </div>

    <!-- ========== 资产配置模块 ========== -->
    <div v-if="activeModule === 'allocation'" class="module-content">
      <a-row :gutter="16">
        <a-col :xs="24" :lg="8">
          <a-card title="配置策略" class="panel-card">
            <a-radio-group v-model:value="allocationStrategy.type" class="allocation-types">
              <a-radio-button value="mean_variance">均值-方差优化</a-radio-button>
              <a-radio-button value="risk_parity">风险平价</a-radio-button>
              <a-radio-button value="black_litterman">Black-Litterman</a-radio-button>
              <a-radio-button value="cppi">CPPI</a-radio-button>
              <a-radio-button value="target_risk">目标风险</a-radio-button>
            </a-radio-group>
          </a-card>

          <a-card title="资产类别" class="panel-card mt-16">
            <div class="asset-list">
              <div v-for="asset in allocationAssets" :key="asset.key" class="asset-item">
                <a-checkbox v-model:checked="asset.enabled">{{ asset.name }}</a-checkbox>
                <a-slider v-if="asset.enabled" v-model:value="asset.weight" :disabled="allocationStrategy.type !== 'manual'" />
              </div>
            </div>
          </a-card>
        </a-col>

        <a-col :xs="24" :lg="10">
          <a-card title="优化配置" class="panel-card">
            <div ref="allocationChartRef" class="allocation-chart"></div>
          </a-card>

          <a-card title="风险收益特征" class="panel-card mt-16">
            <div ref="riskReturnRef" class="risk-return-chart"></div>
          </a-card>
        </a-col>

        <a-col :xs="24" :lg="6">
          <a-card title="配置结果" class="panel-card">
            <div class="allocation-result">
              <div v-for="item in optimizedAllocation" :key="item.key" class="alloc-item">
                <div class="alloc-asset">
                  <div class="asset-color" :style="{ background: item.color }"></div>
                  <span>{{ item.name }}</span>
                </div>
                <div class="alloc-bar">
                  <a-progress :percent="item.weight" :show-info="false" :stroke-color="item.color" />
                </div>
                <div class="alloc-value">{{ item.weight }}%</div>
              </div>
            </div>
          </a-card>
        </a-col>
      </a-row>
    </div>

    <!-- ========== 风险管理模块 ========== -->
    <div v-if="activeModule === 'risk'" class="module-content">
      <a-row :gutter="16">
        <a-col :xs="24" :lg="8">
          <a-card title="风控规则" class="panel-card">
            <a-form :model="riskRules" layout="vertical">
              <a-form-item label="VaR模型">
                <a-radio-group v-model:value="riskRules.varModel">
                  <a-radio-button value="historical">历史模拟</a-radio-button>
                  <a-radio-button value="parametric">参数法</a-radio-button>
                  <a-radio-button value="monte_carlo">蒙特卡洛</a-radio-button>
                </a-radio-group>
              </a-form-item>

              <a-form-item label="风险限额">
                <a-row :gutter="8">
                  <a-col :span="12">
                    <span>最大回撤</span>
                    <a-input-number v-model:value="riskRules.maxDrawdown" addon-after="%" />
                  </a-col>
                  <a-col :span="12">
                    <span>单日VaR</span>
                    <a-input-number v-model:value="riskRules.dailyVar" addon-after="%" />
                  </a-col>
                </a-row>
              </a-form-item>

              <a-form-item label="压力测试场景">
                <a-checkbox-group v-model:value="riskRules.stressScenarios">
                  <a-checkbox value="covid">疫情冲击</a-checkbox>
                  <a-checkbox value="financial_crisis">金融危机</a-checkbox>
                  <a-checkbox value="rate_hike">加息周期</a-checkbox>
                  <a-checkbox value="black_swan">黑天鹅事件</a-checkbox>
                </a-checkbox-group>
              </a-form-item>
            </a-form>
          </a-card>
        </a-col>

        <a-col :xs="24" :lg="16">
          <a-card title="风险分析" class="panel-card">
            <a-tabs>
              <a-tab-pane key="var" tab="VaR分析">
                <div ref="varChartRef" class="risk-chart"></div>
              </a-tab-pane>
              <a-tab-pane key="stress" tab="压力测试">
                <div ref="stressChartRef" class="risk-chart"></div>
              </a-tab-pane>
              <a-tab-pane key="scenario" tab="情景分析">
                <a-table :data-source="scenarioResults" :columns="scenarioColumns" />
              </a-tab-pane>
            </a-tabs>
          </a-card>
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
  ExperimentOutlined, ApartmentOutlined, ThunderboltOutlined, RobotOutlined,
  PieChartOutlined, SafetyOutlined, InfoCircleOutlined, PlayCircleOutlined, SaveOutlined
} from '@ant-design/icons-vue'

const activeModule = ref('factor')

const factorCategories = ref([
  {
    key: 'style', name: '风格因子', shortName: '风格', color: '#1890ff',
    factors: [
      { key: 'size', name: '市值(Size)', weight: 0, description: '小市值效应，Fama-French SMB' },
      { key: 'value', name: '价值(Value)', weight: 0, description: '低PB/PE，基本面投资' },
      { key: 'growth', name: '成长(Growth)', weight: 0, description: '营收/利润增长率' },
      { key: 'quality', name: '质量(Quality)', weight: 0, description: 'ROE/ROA，盈利稳定性' }
    ]
  },
  {
    key: 'momentum', name: '动量因子', shortName: '动量', color: '#52c41a',
    factors: [
      { key: 'momentum_1m', name: '短期动量', weight: 0, description: '1个月价格动量' },
      { key: 'momentum_3m', name: '中期动量', weight: 0, description: '3个月价格动量' },
      { key: 'momentum_12m', name: '长期动量', weight: 0, description: '12-1个月动量' },
      { key: 'reversal', name: '反转', weight: 0, description: '短期反转效应' }
    ]
  },
  {
    key: 'volatility', name: '波动因子', shortName: '波动', color: '#faad14',
    factors: [
      { key: 'beta', name: 'Beta', weight: 0, description: '系统性风险暴露' },
      { key: 'volatility', name: '波动率', weight: 0, description: '历史波动率' },
      { key: 'max_dd', name: '最大回撤', weight: 0, description: '下行风险控制' },
      { key: 'var', name: 'VaR', weight: 0, description: '风险价值' }
    ]
  },
  {
    key: 'liquidity', name: '流动性因子', shortName: '流动性', color: '#eb2f96',
    factors: [
      { key: 'turnover', name: '换手率', weight: 0, description: '流动性指标' },
      { key: 'amount', name: '成交额', weight: 0, description: '日均成交额' },
      { key: 'impact', name: '冲击成本', weight: 0, description: '市场冲击成本' }
    ]
  }
])

const barraFactors = ref({ size: 0.3, value: 0.2, momentum: 0.4, quality: 0.3, volatility: 0.1 })

const factorStrategy = ref({
  name: 'Barra纯多因子Alpha', universe: 'csi500', rebalance: 'monthly',
  holdings: 50, weighting: 'score', neutralize: ['industry', 'market_cap'],
  icThreshold: 0.02, irThreshold: 0.3
})

const getCategoryExposure = (cat) => cat.factors.reduce((sum, f) => sum + Math.abs(f.weight), 0).toFixed(2)
const getExposurePercent = (cat) => Math.min(getCategoryExposure(cat) * 100, 100)
const getExposureClass = (w) => w > 0 ? 'positive' : w < 0 ? 'negative' : ''

const resetFactorExposure = () => factorCategories.value.forEach(c => c.factors.forEach(f => f.weight = 0))
const runFactorBacktest = () => message.success('开始运行多因子回测...')
const saveFactorStrategy = () => message.success('策略已保存')

const smartBetaStrategies = ref([
  { key: 'value', name: '价值策略', icon: '💎', description: '低估值+高股息', logic: 'PB/PE分位数', weighting: 'Score加权', rebalance: '季度', feature: '防御性强' },
  { key: 'momentum', name: '动量策略', icon: '🚀', description: '趋势跟踪', logic: '12个月动量', weighting: '等权', rebalance: '月度', feature: '进攻性强' },
  { key: 'quality', name: '质量策略', icon: '✨', description: '高ROE低杠杆', logic: '盈利+稳健', weighting: '质量得分', rebalance: '半年', feature: '长期稳健' },
  { key: 'low_vol', name: '低波动', icon: '🛡️', description: '低Beta策略', logic: '历史波动率', weighting: '波动倒数', rebalance: '季度', feature: '风险调整后收益' },
  { key: 'dividend', name: '红利策略', icon: '💰', description: '高股息率', logic: '股息率+分红持续性', weighting: '股息率', rebalance: '年度', feature: '现金流稳定' },
  { key: 'esg', name: 'ESG策略', icon: '🌱', description: '可持续发展', logic: 'ESG评分', weighting: 'ESG得分', rebalance: '半年', feature: '长期价值' }
])

const selectedSmartBeta = ref(null)
const selectedSmartBetaName = computed(() => smartBetaStrategies.value.find(x => x.key === selectedSmartBeta.value)?.name || '策略详情')
const currentSmartBeta = computed(() => smartBetaStrategies.value.find(x => x.key === selectedSmartBeta.value))
const selectSmartBeta = (s) => selectedSmartBeta.value = s.key
const runSmartBetaBacktest = () => message.success(`正在回测 ${selectedSmartBetaName.value}...`)
const compareSmartBeta = () => message.info('多策略对比功能开发中')

const mlConfig = ref({ algorithm: 'xgboost', features: ['price', 'volume', 'fundamental'], predictionHorizon: 20, trainWindow: 504 })
const mlPredictions = ref([
  { name: '华夏成长混合', code: '000001', score: 0.92 }, { name: '易方达蓝筹精选', code: '005827', score: 0.88 },
  { name: '富国天惠成长', code: '161005', score: 0.85 }, { name: '中欧时代先锋', code: '001938', score: 0.82 },
  { name: '景顺长城新兴', code: '260108', score: 0.79 }
])
const getScoreColor = (s) => s >= 0.9 ? '#52c41a' : s >= 0.8 ? '#1890ff' : s >= 0.7 ? '#faad14' : '#f5222d'

const allocationStrategy = ref({ type: 'risk_parity' })
const allocationAssets = ref([
  { key: 'stock', name: '股票基金', enabled: true, weight: 40, color: '#f5222d' },
  { key: 'bond', name: '债券基金', enabled: true, weight: 30, color: '#52c41a' },
  { key: 'commodity', name: '商品基金', enabled: true, weight: 10, color: '#faad14' },
  { key: 'reits', name: 'REITs', enabled: true, weight: 10, color: '#722ed1' },
  { key: 'cash', name: '货币基金', enabled: true, weight: 10, color: '#1890ff' }
])
const optimizedAllocation = computed(() => allocationAssets.value.filter(a => a.enabled))

const riskRules = ref({ varModel: 'historical', maxDrawdown: 15, dailyVar: 2, stressScenarios: ['covid', 'rate_hike'] })
const scenarioResults = ref([
  { scenario: '基准情景', return: '12.5%', var: '-8.2%', cvar: '-12.1%' },
  { scenario: '疫情冲击', return: '-15.3%', var: '-22.1%', cvar: '-28.5%' },
  { scenario: '加息周期', return: '-5.2%', var: '-12.5%', cvar: '-16.8%' },
  { scenario: '黑天鹅事件', return: '-25.8%', var: '-35.2%', cvar: '-42.1%' }
])
const scenarioColumns = [{ title: '情景', dataIndex: 'scenario' }, { title: '预期收益', dataIndex: 'return' }, { title: 'VaR(95%)', dataIndex: 'var' }, { title: 'CVaR', dataIndex: 'cvar' }]

const icChartRef = ref(null), smartBetaChartRef = ref(null), featureImportanceRef = ref(null)
const allocationChartRef = ref(null), riskReturnRef = ref(null), varChartRef = ref(null), stressChartRef = ref(null)

onMounted(() => nextTick(() => initCharts()))
watch(activeModule, () => nextTick(() => initCharts()))

const initCharts = () => {
  if (icChartRef.value && activeModule.value === 'factor') {
    echarts.init(icChartRef.value).setOption({
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: ['Size', 'Value', 'Mom', 'Quality', 'Vol', 'Turn'] },
      yAxis: { type: 'value', name: 'IC' },
      series: [
        { name: 'IC均值', type: 'bar', data: [0.03, 0.05, 0.08, 0.04, -0.02, 0.01] },
        { name: 'IR', type: 'line', data: [0.3, 0.5, 0.8, 0.4, -0.2, 0.1] }
      ]
    })
  }
  if (smartBetaChartRef.value && activeModule.value === 'smartbeta') {
    echarts.init(smartBetaChartRef.value).setOption({
      tooltip: { trigger: 'axis' }, legend: { data: ['价值', '动量', '质量', '低波', '红利'] },
      xAxis: { type: 'category', data: ['2019', '2020', '2021', '2022', '2023', '2024'] },
      yAxis: { type: 'value', name: '累计收益(%)' },
      series: [
        { name: '价值', type: 'line', data: [20, 35, 45, 38, 55, 68] },
        { name: '动量', type: 'line', data: [25, 45, 52, 35, 48, 62] },
        { name: '质量', type: 'line', data: [22, 38, 48, 42, 52, 65] },
        { name: '低波', type: 'line', data: [18, 32, 40, 45, 50, 58] },
        { name: '红利', type: 'line', data: [15, 28, 38, 48, 58, 70] }
      ]
    })
  }
  if (featureImportanceRef.value && activeModule.value === 'ml') {
    echarts.init(featureImportanceRef.value).setOption({
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'value' },
      yAxis: { type: 'category', data: ['换手率', 'PE', '动量', 'ROE', '波动率', '成交量', '市值'] },
      series: [{ type: 'bar', data: [0.08, 0.12, 0.18, 0.22, 0.15, 0.14, 0.11] }]
    })
  }
  if (allocationChartRef.value && activeModule.value === 'allocation') {
    echarts.init(allocationChartRef.value).setOption({
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie', radius: ['40%', '70%'],
        data: [
          { name: '股票', value: 40, itemStyle: { color: '#f5222d' } },
          { name: '债券', value: 30, itemStyle: { color: '#52c41a' } },
          { name: '商品', value: 10, itemStyle: { color: '#faad14' } },
          { name: 'REITs', value: 10, itemStyle: { color: '#722ed1' } },
          { name: '现金', value: 10, itemStyle: { color: '#1890ff' } }
        ]
      }]
    })
  }
  if (riskReturnRef.value && activeModule.value === 'allocation') {
    echarts.init(riskReturnRef.value).setOption({
      tooltip: { trigger: 'item' },
      xAxis: { type: 'value', name: '波动率(%)' },
      yAxis: { type: 'value', name: '预期收益(%)' },
      series: [{ type: 'scatter', data: [[15, 10], [12, 8], [8, 5], [20, 15], [5, 3]], symbolSize: 20 }]
    })
  }
  if (varChartRef.value && activeModule.value === 'risk') {
    echarts.init(varChartRef.value).setOption({
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: ['-5σ', '-4σ', '-3σ', '-2σ', '-1σ', '均值', '+1σ', '+2σ', '+3σ', '+4σ', '+5σ'] },
      yAxis: { type: 'value', name: '概率密度' },
      series: [{
        type: 'line', areaStyle: {},
        data: [0.01, 0.05, 0.2, 0.8, 2.5, 4, 2.5, 0.8, 0.2, 0.05, 0.01],
        markLine: { data: [{ xAxis: '-3σ', name: 'VaR 99%' }] }
      }]
    })
  }
  if (stressChartRef.value && activeModule.value === 'risk') {
    echarts.init(stressChartRef.value).setOption({
      tooltip: { trigger: 'axis' }, legend: { data: ['基准', '疫情', '加息', '黑天鹅'] },
      xAxis: { type: 'category', data: ['1月', '3月', '6月', '1年'] },
      yAxis: { type: 'value', name: '累计收益(%)' },
      series: [
        { name: '基准', type: 'line', data: [2, 5, 8, 12] },
        { name: '疫情', type: 'line', data: [-5, -15, -10, -5] },
        { name: '加息', type: 'line', data: [-2, -5, -3, 2] },
        { name: '黑天鹅', type: 'line', data: [-10, -25, -20, -15] }
      ]
    })
  }
}
</script>

<style scoped lang="less">
.model-lab-container {
  .lab-header {
    margin-bottom: 16px;
    .header-main {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      .title-section {
        display: flex;
        align-items: center;
        gap: 16px;
        .lab-icon { font-size: 36px; color: #1890ff; }
        .title-content {
          h1 { margin: 0; font-size: 24px; font-weight: 700; background: linear-gradient(135deg, #1890ff, #722ed1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
          .subtitle { color: #8c8c8c; font-size: 13px; }
        }
      }
    }
  }
  .module-content { animation: fadeIn 0.4s ease; }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .panel-card { height: 100%; }
  .mt-16 { margin-top: 16px; }
  .mt-8 { margin-top: 8px; }
  .factor-category {
    margin-bottom: 20px;
    .category-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #f0f0f0;
      .category-name { font-weight: 600; font-size: 14px; }
    }
    .factor-list {
      .factor-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px;
        border-radius: 6px;
        transition: background 0.2s;
        &:hover, &.active { background: #f6ffed; }
        .factor-label {
          width: 100px;
          display: flex;
          align-items: center;
          gap: 4px;
          .info-icon { color: #8c8c8c; font-size: 12px; cursor: pointer; }
        }
        .factor-control {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 12px;
          .exposure-slider { flex: 1; }
          .exposure-input { width: 70px; }
        }
      }
    }
  }
  .slider-input-group {
    display: flex;
    align-items: center;
    gap: 12px;
    .barra-slider { flex: 1; }
    .barra-input { width: 70px; }
  }
  .term-name {
    cursor: help;
    border-bottom: 1px dashed #1890ff;
    &:hover { color: #1890ff; }
  }
  .exposure-bars {
    .exposure-bar-item {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      .bar-label { width: 50px; font-size: 12px; }
      .bar-track {
        flex: 1;
        height: 8px;
        background: #f0f0f0;
        border-radius: 4px;
        overflow: hidden;
        .bar-fill { height: 100%; transition: width 0.3s; }
      }
      .bar-value { width: 40px; text-align: right; font-size: 12px; font-weight: 500; }
    }
  }
  .preview-section {
    .section-title { font-weight: 600; margin-bottom: 12px; font-size: 13px; color: #262626; }
  }
  .action-area {
    .mt-8 { margin-top: 8px; }
  }
  .input-label { font-size: 12px; color: #8c8c8c; margin-right: 8px; }
  .ic-chart, .strategy-chart, .feature-chart, .allocation-chart, .risk-return-chart, .risk-chart { height: 300px; }
  .strategy-grid {
    display: grid;
    gap: 12px;
    .strategy-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border: 1px solid #f0f0f0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      &:hover, &.active { border-color: #1890ff; background: #f0f5ff; }
      .strategy-icon { font-size: 28px; }
      .strategy-info {
        flex: 1;
        .strategy-name { font-weight: 600; font-size: 14px; }
        .strategy-desc { font-size: 12px; color: #8c8c8c; }
      }
    }
  }
  .strategy-detail {
    .strategy-actions { display: flex; gap: 12px; margin-top: 16px; }
  }
  .algorithm-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    .ant-radio-button-wrapper {
      height: auto;
      padding: 12px;
      .algo-item {
        display: flex;
        flex-direction: column;
        .algo-name { font-weight: 600; font-size: 14px; }
        .algo-desc { font-size: 12px; color: #8c8c8c; }
      }
    }
  }
  .ml-metrics {
    .ml-metric {
      text-align: center;
      padding: 20px;
      background: #f6ffed;
      border-radius: 8px;
      .metric-value { font-size: 32px; font-weight: 700; color: #52c41a; }
      .metric-label { margin-top: 8px; color: #595959; }
    }
  }
  .prediction-list {
    .pred-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border-bottom: 1px solid #f0f0f0;
      &:last-child { border-bottom: none; }
      .pred-rank {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f0f0f0;
        border-radius: 50%;
        font-size: 12px;
        font-weight: 600;
      }
      .pred-info {
        flex: 1;
        .pred-name { font-weight: 500; font-size: 13px; }
        .pred-code { font-size: 11px; color: #8c8c8c; }
      }
      .pred-score { font-weight: 700; font-size: 16px; }
    }
  }
  .allocation-types {
    display: flex;
    flex-direction: column;
    gap: 8px;
    .ant-radio-button-wrapper {
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: auto;
      padding: 12px 16px;
    }
  }
  .asset-list {
    .asset-item { margin-bottom: 16px; }
  }
  .allocation-result {
    .alloc-item {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      .alloc-asset {
        width: 100px;
        display: flex;
        align-items: center;
        gap: 8px;
        .asset-color { width: 12px; height: 12px; border-radius: 2px; }
        span { font-size: 13px; }
      }
      .alloc-bar { flex: 1; }
      .alloc-value { width: 40px; text-align: right; font-weight: 600; }
    }
  }
}
html[data-theme='dark'] {
  .model-lab-container {
    .strategy-card:hover, .strategy-card.active { background: rgba(24, 144, 255, 0.1); }
    .factor-row:hover, .factor-row.active { background: rgba(82, 196, 26, 0.1); }
    .ml-metric { background: rgba(82, 196, 26, 0.1); }
  }
}
</style>
