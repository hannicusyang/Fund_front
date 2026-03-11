<template>
  <div class="fund-analysis">
    <!-- 基金选择 - 移动端优化 -->
    <a-row :gutter="[8, 8]">
      <a-col :span="24">
        <a-card class="selection-card" :body-style="{ padding: isMobile ? '12px' : '24px' }">
          <div class="selection-header" :class="{ 'mobile': isMobile }">
            <span class="label">选择对比基金：</span>
            <div class="select-wrapper">
              <a-select
                v-model:value="selectedFundCodes"
                mode="multiple"
                :style="{ width: isMobile ? '100%' : '500px' }"
                placeholder="请选择要分析的基金"
                :max-tag-count="isMobile ? 2 : 5"
                :max-tag-placeholder="omitted => `+${omitted.length}`"
              >
                <a-select-option 
                  v-for="fund in fundPool" 
                  :key="fund.fund_code"
                  :value="fund.fund_code"
                >
                  {{ fund.fund_name }} ({{ fund.fund_code }})
                </a-select-option>
              </a-select>
            </div>
            <a-space class="action-btns" :size="isMobile ? 'small' : 'middle'">
              <a-button size="small" @click="selectAll">全选</a-button>
              <a-button size="small" @click="clearSelection">清空</a-button>
            </a-space>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 收益走势对比 - 移动端优化 -->
    <a-row :gutter="[8, 8]" style="margin-top: 12px">
      <a-col :span="24">
        <a-card 
          title="收益走势对比" 
          class="chart-card"
          :body-style="{ padding: isMobile ? '8px' : '24px' }"
        >
          <template #extra>
            <a-space>
              <a-button type="primary" ghost @click="runAIAnalysis" :loading="aiAnalysisLoading">
                <RobotOutlined /> AI分析
              </a-button>
              <!-- 移动端：折叠式控制面板 -->
              <template v-if="isMobile">
                <a-button type="link" size="small" @click="showMobileControls = !showMobileControls">
                  <SettingOutlined /> 设置
                </a-button>
              </template>
              <template v-else>
                <a-space wrap>
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
                  <a-radio-group v-model:value="timeRange" size="small" @change="handleTimeRangeChange">
                    <a-radio-button value="1m">近1月</a-radio-button>
                    <a-radio-button value="3m">近3月</a-radio-button>
                    <a-radio-button value="6m">近6月</a-radio-button>
                    <a-radio-button value="1y">近1年</a-radio-button>
                    <a-radio-button value="3y">近3年</a-radio-button>
                    <a-radio-button value="5y">近5年</a-radio-button>
                  </a-radio-group>
                  <a-button type="primary" size="small" @click="loadTrendData" :loading="trendLoading">
                    <ReloadOutlined />
                  </a-button>
                </a-space>
              </template>
            </a-space>
          </template>
          
          <!-- 移动端控制面板 -->
          <div v-if="isMobile && showMobileControls" class="mobile-controls">
            <div class="control-section">
              <span class="control-label">基准指数</span>
              <a-select
                v-model:value="selectedBenchmarks"
                mode="multiple"
                style="width: 100%"
                placeholder="选择基准"
                :max-tag-count="1"
              >
                <a-select-option 
                  v-for="bm in benchmarkList" 
                  :key="bm.code"
                  :value="bm.code"
                >
                  {{ bm.name }}
                </a-select-option>
              </a-select>
            </div>
            <div class="control-section">
              <span class="control-label">时间范围</span>
              <a-radio-group v-model:value="timeRange" size="small" @change="handleTimeRangeChange">
                <a-radio-button value="1m">1月</a-radio-button>
                <a-radio-button value="3m">3月</a-radio-button>
                <a-radio-button value="6m">6月</a-radio-button>
                <a-radio-button value="1y">1年</a-radio-button>
                <a-radio-button value="3y">3年</a-radio-button>
              </a-radio-group>
            </div>
            <a-button type="primary" block size="small" @click="loadTrendData" :loading="trendLoading">
              <ReloadOutlined /> 刷新数据
            </a-button>
          </div>
          
          <div ref="trendChartRef" class="chart" :style="{ height: isMobile ? '280px' : '400px' }"></div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 基金指标对比表 - 移动端优化 -->
    <a-row :gutter="[8, 8]" style="margin-top: 12px">
      <a-col :span="24">
        <a-card class="metrics-card" :body-style="{ padding: isMobile ? '8px' : '24px' }">
          <template #title>
            <div class="metrics-title" :class="{ 'mobile': isMobile }">
              <span>基金量化指标对比</span>
              <a-radio-group v-model:value="metricsViewMode" size="small">
                <a-radio-button value="basic">基础</a-radio-button>
                <a-radio-button value="professional">专业</a-radio-button>
              </a-radio-group>
            </div>
          </template>
          <template #extra>
            <template v-if="metricsViewMode === 'professional'">
              <!-- 移动端：折叠式设置按钮 -->
              <template v-if="isMobile">
                <a-button type="link" size="small" @click="showMobileMetricsControls = !showMobileMetricsControls">
                  <SettingOutlined /> 设置
                </a-button>
              </template>
              <!-- PC端：直接显示选择器 -->
              <a-space v-else wrap size="small">
                <span>基准：</span>
                <a-select v-model:value="metricsBenchmark" style="width: 100px" size="small">
                  <a-select-option v-for="bm in benchmarkList" :key="bm.code" :value="bm.code">
                    {{ bm.name }}
                  </a-select-option>
                </a-select>
                <span>周期：</span>
                <a-select v-model:value="metricsPeriod" style="width: 60px" size="small" @change="loadProfessionalMetrics">
                  <a-select-option value="1y">1年</a-select-option>
                  <a-select-option value="2y">2年</a-select-option>
                  <a-select-option value="3y">3年</a-select-option>
                </a-select>
                <a-button size="small" @click="loadProfessionalMetrics" :loading="professionalMetricsLoading">
                  <ReloadOutlined />
                </a-button>
              </a-space>
            </template>
          </template>
          
          <!-- 移动端专业指标控制面板 -->
          <div v-if="isMobile && metricsViewMode === 'professional' && showMobileMetricsControls" class="mobile-metrics-controls">
            <div class="control-section">
              <span class="control-label">基准指数</span>
              <a-select v-model:value="metricsBenchmark" style="width: 100%" size="small">
                <a-select-option v-for="bm in benchmarkList" :key="bm.code" :value="bm.code">
                  {{ bm.name }}
                </a-select-option>
              </a-select>
            </div>
            <div class="control-section">
              <span class="control-label">计算周期</span>
              <a-radio-group v-model:value="metricsPeriod" size="small" @change="loadProfessionalMetrics">
                <a-radio-button value="1y">1年</a-radio-button>
                <a-radio-button value="2y">2年</a-radio-button>
                <a-radio-button value="3y">3年</a-radio-button>
              </a-radio-group>
            </div>
            <a-button type="primary" block size="small" @click="loadProfessionalMetrics" :loading="professionalMetricsLoading">
              <ReloadOutlined /> 刷新数据
            </a-button>
          </div>
          
          <!-- 基础指标表格 - 移动端简化列 -->
          <a-table
            v-if="metricsViewMode === 'basic'"
            :data-source="selectedFundsWithMetrics"
            :columns="isMobile ? mobileMetricsColumns : metricsColumns"
            :pagination="false"
            size="small"
            bordered
            :scroll="isMobile ? { x: 600 } : undefined"
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
                <a-tag :color="getRankColor(record[column.dataIndex])" size="small">
                  {{ record[column.dataIndex] }}
                </a-tag>
              </template>
            </template>
          </a-table>

          <!-- 专业指标表格 - 移动端横向滚动 -->
          <a-table
            v-else
            :data-source="professionalMetricsData"
            :columns="professionalMetricsColumns"
            :pagination="false"
            :loading="professionalMetricsLoading"
            size="small"
            bordered
            :scroll="{ x: isMobile ? 1200 : 1600 }"
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
              <template v-else-if="['sharpe_ratio', 'sortino_ratio', 'calmar_ratio'].includes(column.dataIndex)">
                <span :class="getSharpeClass(record[column.dataIndex])">
                  {{ formatNumber(record[column.dataIndex]) }}
                </span>
              </template>
              <template v-else-if="column.dataIndex === 'win_rate'">
                <a-progress 
                  :percent="record[column.dataIndex]" 
                  :stroke-color="record[column.dataIndex] >= 50 ? '#52c41a' : '#faad14'"
                  size="small"
                  :style="{ width: isMobile ? '50px' : '80px' }"
                />
              </template>
              <template v-else-if="column.dataIndex === 'beta'">
                <a-tag :color="getBetaTagColor(record[column.dataIndex])" size="small">
                  {{ formatNumber(record[column.dataIndex]) }}
                </a-tag>
              </template>
              <template v-else-if="column.dataIndex">
                {{ formatNumber(record[column.dataIndex]) }}
              </template>
            </template>
          </a-table>

          <!-- 基准信息 - 移动端优化 -->
          <div v-if="metricsViewMode === 'professional' && benchmarkInfo" class="benchmark-info">
            <a-divider />
            <div class="benchmark-grid" :class="{ 'mobile': isMobile }">
              <div class="benchmark-item">
                <span class="label">基准指数</span>
                <span class="value">{{ benchmarkInfo.name }}</span>
              </div>
              <div class="benchmark-item">
                <span class="label">年化收益</span>
                <span :class="['value', getRateClass(benchmarkInfo.annual_return)]">
                  {{ formatRate(benchmarkInfo.annual_return) }}
                </span>
              </div>
              <div class="benchmark-item">
                <span class="label">波动率</span>
                <span class="value">{{ formatNumber(benchmarkInfo.volatility) }}%</span>
              </div>
              <div class="benchmark-item">
                <span class="label">无风险利率</span>
                <span class="value">{{ riskFreeRate }}%</span>
              </div>
            </div>
            <div v-if="!benchmarkInfo.data_source" class="benchmark-warning">
              <a-tag color="orange" size="small">⚠️ 基准数据暂不可用</a-tag>
              <span class="warning-text">相关指标无法计算</span>
            </div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 风险收益散点图和相关性热力图 - 移动端优化 -->
    <a-row :gutter="[8, 8]" style="margin-top: 12px">
      <a-col :xs="24" :lg="12">
        <a-card 
          title="风险收益分布" 
          class="chart-card risk-return-card"
          :body-style="{ padding: isMobile ? '8px' : '24px' }"
        >
          <template #extra>
            <a-dropdown v-if="isMobile">
              <a-button size="small"><SettingOutlined /> 设置</a-button>
              <template #overlay>
                <a-menu>
                  <a-menu-item-group title="收益周期">
                    <a-menu-item v-for="p in riskPeriods" :key="p.value" @click="riskPeriod = p.value; handleRiskPeriodChange()">
                      {{ p.label }}
                    </a-menu-item>
                  </a-menu-item-group>
                  <a-menu-item-group title="波动周期">
                    <a-menu-item v-for="p in volatilityPeriods" :key="p.value" @click="volatilityPeriod = p.value; handleRiskPeriodChange()">
                      {{ p.label }}
                    </a-menu-item>
                  </a-menu-item-group>
                </a-menu>
              </template>
            </a-dropdown>
            <a-space v-else wrap size="small">
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
          <div v-if="selectedFundCodes.length === 0" class="chart-placeholder" :style="{ height: isMobile ? '300px' : '480px' }">
            <a-empty description="请先选择基金" />
          </div>
          <div v-else ref="riskReturnChartRef" class="chart" :style="{ height: isMobile ? '300px' : '480px' }"></div>
        </a-card>
      </a-col>

      <a-col :xs="24" :lg="12">
        <a-card 
          title="基金相关性分析" 
          class="chart-card"
          :loading="correlationLoading"
          :body-style="{ padding: isMobile ? '8px' : '24px' }"
        >
          <div v-if="showCorrelationEmpty" class="chart-placeholder" :style="{ height: isMobile ? '300px' : '350px' }">
            <a-empty description="请选择至少2只基金进行分析" />
          </div>
          <div v-show="!showCorrelationEmpty" ref="correlationChartRef" class="chart" :style="{ height: isMobile ? '300px' : '350px' }"></div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 智能分析报告 - 移动端优化 -->
    <a-row style="margin-top: 12px">
      <a-col :span="24">
        <a-card class="analysis-report-card" :body-style="{ padding: isMobile ? '8px' : '24px' }">
          <template #title>
            <div class="report-title">
              <span>📊 智能分析报告</span>
              <a-tag v-if="selectedFundCodes.length > 0" :color="healthGrade.color" size="small">
                {{ healthGrade.label }}
              </a-tag>
            </div>
          </template>
          <template #extra>
            <a-button type="link" size="small" @click="refreshAnalysis" :loading="analysisLoading">
              <ReloadOutlined /> {{ isMobile ? '' : '刷新分析' }}
            </a-button>
          </template>

          <!-- 空状态 -->
          <div v-if="selectedFundCodes.length === 0" class="empty-analysis">
            <a-empty description="请先选择基金进行分析" />
          </div>

          <template v-else>
            <!-- 第一行：健康度仪表盘 + 组合雷达图 -->
            <a-row :gutter="[8, 16]">
              <a-col :xs="24" :lg="8">
                <div class="health-dashboard">
                  <div class="health-score-container">
                    <div ref="healthGaugeRef" class="health-gauge" :style="{ height: isMobile ? '150px' : '180px' }"></div>
                    <div class="health-details" :class="{ 'mobile': isMobile }">
                      <div v-for="(item, key) in healthDetailItems" :key="key" class="detail-item">
                        <span class="label">{{ item.label }}</span>
                        <a-progress 
                          :percent="item.value" 
                          :stroke-color="getScoreColor(item.value)"
                          :show-info="false"
                          size="small"
                          :style="{ width: isMobile ? '80px' : 'auto' }"
                        />
                        <span class="score">{{ item.value }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </a-col>
              
              <a-col :xs="24" :lg="16">
                <div ref="radarChartRef" class="radar-chart" :style="{ height: isMobile ? '280px' : '320px' }"></div>
              </a-col>
            </a-row>

            <!-- 第二行：核心指标卡片 - 移动端2列 -->
            <a-row :gutter="[8, 8]" style="margin-top: 12px">
              <a-col v-for="(card, idx) in metricCards" :key="idx" :xs="12" :sm="6">
                <div class="metric-card" :class="card.className">
                  <div class="metric-icon">{{ card.icon }}</div>
                  <div class="metric-content">
                    <div class="metric-label">{{ card.label }}</div>
                    <div class="metric-value">{{ card.value }}</div>
                    <div class="metric-detail" :class="card.detailClass">{{ card.detail }}</div>
                  </div>
                </div>
              </a-col>
            </a-row>

            <!-- 第三行：基金排名对比表 - 移动端简化 -->
            <div class="ranking-section" style="margin-top: 16px">
              <div class="section-title">
                <span>📈 多维度排名对比</span>
                <a-tooltip title="基于年化收益、夏普比率、波动率、近期动能等维度综合排名">
                  <InfoCircleOutlined style="margin-left: 8px; color: #8c8c8c" />
                </a-tooltip>
              </div>
              <a-table
                :data-source="fundRankings"
                :columns="isMobile ? mobileRankingColumns : rankingColumns"
                :pagination="{ pageSize: isMobile ? 5 : 10, size: 'small' }"
                size="small"
                bordered
                class="ranking-table"
                :scroll="isMobile ? { x: 500 } : undefined"
              >
                <template #bodyCell="{ column, record, index }">
                  <template v-if="column.key === 'rank'">
                    <a-badge 
                      :count="index + 1" 
                      :number-style="{ 
                        backgroundColor: getRankBadgeColor(index),
                        fontWeight: 'bold',
                        fontSize: '12px'
                      }"
                    />
                  </template>
                  <template v-else-if="column.key === 'fund_name'">
                    <div class="fund-name-cell">
                      <span class="name">{{ record.fund_name }}</span>
                      <span class="code">{{ record.fund_code }}</span>
                    </div>
                  </template>
                  <template v-else-if="['returnRank', 'sharpeRank', 'volatilityRank', 'momentumRank'].includes(column.key)">
                    <a-tag :color="getRankTagColor(record[column.key], fundRankings.length)" size="small">
                      #{{ record[column.key] }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'overallScore'">
                    <div class="score-cell">
                      <a-progress 
                        :percent="record.overallScore" 
                        :stroke-color="getScoreGradient(record.overallScore)"
                        :format="() => record.overallScore.toFixed(0)"
                        size="small"
                        :style="{ width: isMobile ? '50px' : '80px' }"
                      />
                    </div>
                  </template>
                  <template v-else-if="column.key === 'recommendation'">
                    <a-tag :color="record.recommendation.color" size="small">
                      {{ isMobile ? record.recommendation.text.substring(0, 2) : record.recommendation.text }}
                    </a-tag>
                  </template>
                </template>
              </a-table>
            </div>

            <!-- 第四行：智能投资建议 - 移动端垂直排列 -->
            <div class="recommendations-section" style="margin-top: 16px">
              <div class="section-title">💡 智能投资建议</div>
              <a-row :gutter="[8, 8]">
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
                      <div v-if="coreRecommendations.length === 0" class="no-recommendations">
                        暂无核心建议
                      </div>
                    </div>
                  </div>
                </a-col>
                
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
                        <CheckCircleOutlined style="color: #52c41a; font-size: 20px" />
                        <span>暂无重大风险提示</span>
                      </div>
                    </div>
                  </div>
                </a-col>
              </a-row>
            </div>

            <!-- 第五行：组合优化建议 - 移动端单列 -->
            <div class="optimization-section" style="margin-top: 16px">
              <div class="section-title">🔧 组合优化建议</div>
              <a-row :gutter="[8, 8]">
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

    <!-- AI分析面板 -->
    <a-drawer
      v-model:open="showAIPanel"
      :title="'AI智能分析报告'"
      placement="right"
      :width="isMobile ? '100%' : 500"
    >
      <template #extra>
        <a-button v-if="aiAnalysisResult && !aiAnalysisLoading" type="primary" size="small" @click="runAIAnalysis">
          <ReloadOutlined /> 重新AI分析
        </a-button>
      </template>
      <a-spin :spinning="aiAnalysisLoading">
        <div v-if="aiAnalysisResult" class="ai-analysis-result">
          <!-- 多基金对比分析：显示各基金评分 -->
          <template v-if="aiAnalysisResult.各基金评分">
            <a-card size="small" class="ai-card">
              <template #title>
                <span>📊 多基金对比分析 ({{ aiAnalysisResult.funds_count }}只基金)</span>
              </template>
              <div v-for="(fund, name) in aiAnalysisResult.各基金评分" :key="name" class="fund-score-item">
                <div class="fund-score-header">
                  <div class="fund-name-info">
                    <span class="fund-name">{{ name }}</span>
                    <a-tag v-if="fund.代码" size="small">{{ fund.代码 }}</a-tag>
                  </div>
                  <a-progress 
                    :percent="fund.评分" 
                    :color="getScoreColor(fund.评分)"
                    size="small"
                    :style="{ width: '100px' }"
                  />
                </div>
                <div class="fund-scores" v-if="fund.收益评分 || fund.风险评分">
                  <a-tag>收益:{{ fund.收益评分 || '-' }}</a-tag>
                  <a-tag>风险:{{ fund.风险评分 || '-' }}</a-tag>
                </div>
                <div class="fund-advantages" v-if="fund.优势 && fund.优势.length">
                  <span class="label">✅ 优势:</span>
                  <div class="tag-list">
                    <a-tag color="green" v-for="(item, idx) in fund.优势" :key="idx" size="small">
                      {{ item }}
                    </a-tag>
                  </div>
                </div>
                <div class="fund-disadvantages" v-if="fund.劣势 && fund.劣势.length">
                  <span class="label">⚠️ 劣势:</span>
                  <div class="tag-list">
                    <a-tag color="orange" v-for="(item, idx) in fund.劣势" :key="idx" size="small">
                      {{ item }}
                    </a-tag>
                  </div>
                </div>
              </div>
            </a-card>
          </template>

          <!-- 单基金分析：显示综合评分 -->
          <template v-else>
            <a-card size="small" class="ai-card">
              <template #title>
                <span>综合评分</span>
              </template>
              <div class="score-display">
                <a-progress 
                  type="circle" 
                  :percent="parseInt(aiAnalysisResult.综合评分?.replace('/100', '') || aiAnalysisResult.评分 || '0')" 
                  :color="getScoreColor(parseInt(aiAnalysisResult.综合评分?.replace('/100', '') || aiAnalysisResult.评分 || '0'))"
                />
                <div class="score-detail">
                  <div><strong>收益评分:</strong> {{ aiAnalysisResult.收益评分 || aiAnalysisResult.评分 || 'N/A' }}</div>
                  <div><strong>风险评分:</strong> {{ aiAnalysisResult.风险评分 || 'N/A' }}</div>
                  <div><strong>规模评分:</strong> {{ aiAnalysisResult.规模评分 || 'N/A' }}</div>
                </div>
              </div>
            </a-card>

            <!-- 优势 -->
            <a-card size="small" class="ai-card" title="优势">
              <a-tag color="green" v-for="(item, index) in (aiAnalysisResult.优势 || [])" :key="index">
                {{ item }}
              </a-tag>
            </a-card>

            <!-- 风险点 -->
            <a-card size="small" class="ai-card" :title="aiAnalysisResult.风险点 ? '风险点' : '劣势'">
              <a-tag :color="aiAnalysisResult.风险点 ? 'red' : 'orange'" v-for="(item, index) in (aiAnalysisResult.风险点 || aiAnalysisResult.劣势 || [])" :key="index">
                {{ item }}
              </a-tag>
            </a-card>
          </template>

          <!-- 投资建议 -->
          <a-card size="small" class="ai-card">
            <template #title>💡 投资建议</template>
            <a-alert
              :message="aiAnalysisResult.投资建议 || aiAnalysisResult.对比结论 || '建议持有'"
              :type="(aiAnalysisResult.投资建议 || '').includes('买入') ? 'success' : (aiAnalysisResult.投资建议 || '').includes('卖出') ? 'error' : 'info'"
              show-icon
              style="margin-bottom: 12px"
            />
            <a-divider v-if="aiAnalysisResult.风险提示 || aiAnalysisResult.适合人群 || aiAnalysisResult.推荐基金" />
            <div v-if="aiAnalysisResult.风险提示" class="ai-info-item">
              <span class="label">⚠️ 风险提示：</span>
              <span>{{ aiAnalysisResult.风险提示 }}</span>
            </div>
            <div v-if="aiAnalysisResult.适合人群" class="ai-info-item">
              <span class="label">👤 适合人群：</span>
              <span>{{ aiAnalysisResult.适合人群 }}</span>
            </div>
            <div v-if="aiAnalysisResult.推荐基金" class="ai-info-item">
              <span class="label">🏆 推荐基金：</span>
              <a-tag color="blue" size="small">{{ aiAnalysisResult.推荐基金 }}</a-tag>
            </div>
          </a-card>

          <!-- 对比结论（多基金分析时显示） -->
          <a-card v-if="aiAnalysisResult.对比结论 && aiAnalysisResult.各基金评分" size="small" class="ai-card">
            <template #title>📈 综合分析结论</template>
            <div style="white-space: pre-wrap; font-size: 13px; line-height: 1.6;">
              {{ aiAnalysisResult.对比结论 }}
            </div>
          </a-card>

          <!-- 分析信息 -->
          <div class="analysis-meta">
            <small v-if="aiAnalysisResult._ai_analysis">🤖 AI智能分析 · {{ aiAnalysisResult.analysis_date }}</small>
            <small v-else>📊 本地分析 · {{ aiAnalysisResult.analysis_date }}</small>
          </div>
        </div>
        <a-empty v-else-if="!aiAnalysisLoading" description="点击上方按钮开始AI分析" />
      </a-spin>
    </a-drawer>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { message } from 'ant-design-vue'
import { ReloadOutlined, InfoCircleOutlined, CheckCircleOutlined, SettingOutlined, RobotOutlined } from '@ant-design/icons-vue'
import { fundAnalysisApi, benchmarkApi } from '@/api/fundModel.js'
import { fundAIApi } from '@/api/fundModel.js'
import dayjs from 'dayjs'

const props = defineProps({
  fundPool: {
    type: Array,
    default: () => []
  }
})

// ============ 响应式检测 ============
const isMobile = ref(false)
const showMobileControls = ref(false)
const showMobileMetricsControls = ref(false)

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

// ============ 周期选项 ============
const riskPeriods = [
  { value: '1m', label: '1月' },
  { value: '3m', label: '3月' },
  { value: '6m', label: '6月' },
  { value: '1y', label: '1年' },
  { value: '2y', label: '2年' },
  { value: '3y', label: '3年' }
]

const volatilityPeriods = [
  { value: '1m', label: '短波' },
  { value: '3m', label: '中波' },
  { value: '1y', label: '长波' }
]

// ============ 健康度详情项 ============
const healthDetailItems = computed(() => [
  { label: '收益能力', value: healthMetrics.value.returnScore },
  { label: '风险控制', value: healthMetrics.value.riskScore },
  { label: '分散程度', value: healthMetrics.value.diversificationScore },
  { label: '成长动能', value: healthMetrics.value.momentumScore }
])

// ============ 核心指标卡片数据 ============
const metricCards = computed(() => [
  {
    className: 'best-return',
    icon: '🏆',
    label: '收益冠军',
    value: analysisResult.value.bestReturn?.fund_name?.substring(0, isMobile.value ? 6 : 8) || '--',
    detail: formatRate(analysisResult.value.bestReturn?.yearly_1_growth_rate),
    detailClass: getRateClass(analysisResult.value.bestReturn?.yearly_1_growth_rate)
  },
  {
    className: 'best-sharpe',
    icon: '⚖️',
    label: '风险调整最优',
    value: analysisResult.value.bestSharpe?.fund_name?.substring(0, isMobile.value ? 6 : 8) || '--',
    detail: `夏普 ${formatNumber(analysisResult.value.bestSharpe?.sharpe)}`,
    detailClass: ''
  },
  {
    className: 'lowest-risk',
    icon: '🛡️',
    label: '最稳健',
    value: analysisResult.value.lowestVolatility?.fund_name?.substring(0, isMobile.value ? 6 : 8) || '--',
    detail: `波动率 ${formatNumber(analysisResult.value.lowestVolatility?.volatility)}%`,
    detailClass: ''
  },
  {
    className: 'best-momentum',
    icon: '🚀',
    label: '近期最强',
    value: analysisResult.value.highestGrowth?.fund_name?.substring(0, isMobile.value ? 6 : 8) || '--',
    detail: `3月 ${formatRate(analysisResult.value.highestGrowth?.monthly_3_growth_rate)}`,
    detailClass: getRateClass(analysisResult.value.highestGrowth?.monthly_3_growth_rate)
  }
])

// ============ 移动端表格列定义 ============
const mobileMetricsColumns = [
  { title: '基金', key: 'fund_name', width: 140, fixed: 'left' },
  { title: '排名', dataIndex: 'rank', key: 'rank', width: 60, align: 'center' },
  { title: '日涨幅', dataIndex: 'daily_growth_rate', width: 70, align: 'right' },
  { title: '年度收益', dataIndex: 'yearly_1_growth_rate', width: 80, align: 'right' },
  { title: '夏普', dataIndex: 'sharpe', width: 60, align: 'right' }
]

const mobileRankingColumns = [
  { title: '排名', key: 'rank', width: 50, align: 'center' },
  { title: '基金', key: 'fund_name', width: 120 },
  { title: '收益', key: 'returnRank', width: 60, align: 'center' },
  { title: '夏普', key: 'sharpeRank', width: 60, align: 'center' },
  { title: '评分', key: 'overallScore', width: 70, align: 'center' },
  { title: '建议', key: 'recommendation', width: 60, align: 'center' }
]

// ============ 辅助函数 ============
function getBetaTagColor(value) {
  if (value > 1.2) return 'red'
  if (value < 0.8) return 'blue'
  return 'default'
}

function getRankBadgeColor(index) {
  if (index === 0) return '#ffd700'
  if (index === 1) return '#c0c0c0'
  if (index === 2) return '#cd7f32'
  return '#8c8c8c'
}

// ============ 原有代码保持不变 ============
// 选中的基金代码
const selectedFundCodes = ref([])

// 基准指数相关
const benchmarkList = ref([
  { code: '000300', name: '沪深300' },
  { code: '000905', name: '中证500' },
  { code: '000001', name: '上证指数' },
  { code: '399006', name: '创业板指' }
])
const selectedBenchmarks = ref(['000300'])
const benchmarkData = ref({})

// 时间范围
const timeRange = ref('1y')
const customDateRange = ref(null)
const trendLoading = ref(false)

// 风险收益分析参数
const riskPeriod = ref('1y')
const volatilityPeriod = ref('1y')

// 收益走势数据
const trendData = ref({})

// 专业指标相关
const metricsViewMode = ref('basic')
const metricsBenchmark = ref('000300')
const metricsPeriod = ref('1y')
const professionalMetricsData = ref([])
const professionalMetricsLoading = ref(false)
const benchmarkInfo = ref(null)
const riskFreeRate = ref(2.5)

// AI分析相关
const showAIPanel = ref(false)
const aiAnalysisLoading = ref(false)
const aiAnalysisResult = ref(null)

// 风险收益数据
const riskReturnData = ref({ funds: [], selected_avg: {}, market_avg: {} })

// 指标列定义
const metricsColumns = [
  { title: '基金', key: 'fund_name', width: 200, fixed: 'left' },
  { title: '排名', dataIndex: 'rank', key: 'rank', width: 80, align: 'center' },
  { title: '最新净值', dataIndex: 'net_value', width: 100, align: 'right' },
  { title: '日涨幅', dataIndex: 'daily_growth_rate', width: 90, align: 'right' },
  { title: '周涨幅', dataIndex: 'weekly_growth_rate', width: 90, align: 'right' },
  { title: '月涨幅', dataIndex: 'monthly_1_growth_rate', width: 90, align: 'right' },
  { title: '3月涨幅', dataIndex: 'monthly_3_growth_rate', width: 90, align: 'right' },
  { title: '6月涨幅', dataIndex: 'monthly_6_growth_rate', width: 90, align: 'right' },
  { title: '年度收益', dataIndex: 'yearly_1_growth_rate', width: 100, align: 'right' },
  { title: '夏普比率', dataIndex: 'sharpe', width: 100, align: 'right' }
]

// 专业指标列定义
const professionalMetricsColumns = [
  { title: '基金', key: 'fund_name', width: 180, fixed: 'left' },
  { title: '评级', key: 'morningstar_rating', width: 100, align: 'center' },
  { title: '年化收益', dataIndex: 'annual_return', width: 100, align: 'right' },
  { title: '年化波动', dataIndex: 'volatility', width: 90, align: 'right' },
  { title: '最大回撤', dataIndex: 'max_drawdown', width: 90, align: 'right' },
  { title: '夏普比率', dataIndex: 'sharpe_ratio', width: 90, align: 'right' },
  { title: '索提诺', dataIndex: 'sortino_ratio', width: 80, align: 'right' },
  { title: '卡玛比率', dataIndex: 'calmar_ratio', width: 90, align: 'right' },
  { title: 'Alpha', dataIndex: 'alpha', width: 80, align: 'right' },
  { title: 'Beta', dataIndex: 'beta', width: 70, align: 'center' },
  { title: '信息比率', dataIndex: 'information_ratio', width: 90, align: 'right' },
  { title: '胜率', dataIndex: 'win_rate', width: 100, align: 'center' },
  { title: '盈亏比', dataIndex: 'profit_loss_ratio', width: 80, align: 'right' }
]

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
    case '1m': startDate = dayjs().subtract(1, 'month').format('YYYY-MM-DD'); break
    case '3m': startDate = dayjs().subtract(3, 'month').format('YYYY-MM-DD'); break
    case '6m': startDate = dayjs().subtract(6, 'month').format('YYYY-MM-DD'); break
    case '1y': startDate = dayjs().subtract(1, 'year').format('YYYY-MM-DD'); break
    case '3y': startDate = dayjs().subtract(3, 'year').format('YYYY-MM-DD'); break
    case '5y': startDate = dayjs().subtract(5, 'year').format('YYYY-MM-DD'); break
    case 'all': startDate = '2000-01-01'; break
    case 'custom':
      if (customDateRange.value?.length === 2) {
        return {
          startDate: customDateRange.value[0].format('YYYY-MM-DD'),
          endDate: customDateRange.value[1].format('YYYY-MM-DD')
        }
      }
      startDate = dayjs().subtract(1, 'year').format('YYYY-MM-DD')
      break
    default: startDate = dayjs().subtract(1, 'year').format('YYYY-MM-DD')
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
    
    const [fundResponse, benchmarkResponse] = await Promise.all([
      fundAnalysisApi.getReturnsAnalysis(selectedFundCodes.value, startDate, endDate),
      selectedBenchmarks.value.length > 0 
        ? benchmarkApi.getBenchmarkHistory(selectedBenchmarks.value, startDate, endDate)
        : Promise.resolve({ success: true, data: {} })
    ])

    if (fundResponse.success) trendData.value = fundResponse.data
    if (benchmarkResponse.success) benchmarkData.value = benchmarkResponse.data
    
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
    nextTick(() => initRiskReturnChart())
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
  if (timeRange.value !== 'custom') loadTrendData()
}

// 自定义日期变化
function handleCustomDateChange() {
  if (customDateRange.value?.length === 2) loadTrendData()
}

// 风险收益周期变化
function handleRiskPeriodChange() {
  loadRiskReturnData()
}

// 分析结果
const analysisResult = computed(() => {
  const funds = selectedFundsWithMetrics.value
  const riskData = riskReturnData.value.funds || []
  
  if (funds.length === 0) return {}

  const mergedFunds = funds.map(fund => {
    const riskInfo = riskData.find(r => r.code === fund.fund_code) || {}
    return {
      ...fund,
      volatility: riskInfo.volatilities?.[volatilityPeriod.value] || null,
      sharpe: riskInfo.sharpe_ratios?.[volatilityPeriod.value] || parseFloat(fund.sharpe || 0)
    }
  })

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
    
    allFunds: mergedFunds,
    scoredFunds
  }
})

// 健康度评分指标
const healthMetrics = computed(() => {
  const funds = selectedFundsWithMetrics.value
  const riskData = riskReturnData.value.funds || []
  const proMetrics = professionalMetricsData.value || []
  
  if (funds.length === 0) {
    return { returnScore: 0, riskScore: 0, diversificationScore: 0, momentumScore: 0, total: 0 }
  }

  let avgReturn
  if (proMetrics.length > 0) {
    avgReturn = proMetrics.reduce((sum, f) => sum + (f.annual_return || 0), 0) / proMetrics.length
  } else {
    avgReturn = funds.reduce((sum, f) => sum + parseFloat(f.yearly_1_growth_rate || 0), 0) / funds.length
  }
  const returnScore = Math.min(100, Math.max(0, 50 + avgReturn * 1.5))

  let riskScore
  if (proMetrics.length > 0) {
    const avgSharpe = proMetrics.reduce((sum, f) => sum + (f.sharpe_ratio || 0), 0) / proMetrics.length
    const avgDrawdown = proMetrics.reduce((sum, f) => sum + (f.max_drawdown || 0), 0) / proMetrics.length
    const sharpeScore = Math.min(100, Math.max(0, 50 + avgSharpe * 25))
    const drawdownScore = Math.min(100, Math.max(0, 100 - avgDrawdown * 2))
    riskScore = sharpeScore * 0.6 + drawdownScore * 0.4
  } else {
    const avgSharpe = riskData.length > 0 
      ? riskData.reduce((sum, f) => sum + (f.sharpe_ratios?.[volatilityPeriod.value] || 0), 0) / riskData.length
      : funds.reduce((sum, f) => sum + parseFloat(f.sharpe || 0), 0) / funds.length
    riskScore = Math.min(100, Math.max(0, 50 + avgSharpe * 25))
  }

  let diversificationScore = 0
  if (funds.length >= 5) diversificationScore = 90
  else if (funds.length >= 3) diversificationScore = 70
  else if (funds.length >= 2) diversificationScore = 50
  else diversificationScore = 30
  
  const corrMatrix = correlationData.value.matrix || []
  if (corrMatrix.length > 0) {
    let totalCorr = 0, count = 0
    for (let i = 0; i < corrMatrix.length; i++) {
      for (let j = i + 1; j < corrMatrix[i].length; j++) {
        totalCorr += Math.abs(parseFloat(corrMatrix[i][j]))
        count++
      }
    }
    if (count > 0) {
      const avgCorr = totalCorr / count
      diversificationScore = diversificationScore * (1.2 - avgCorr * 0.4)
      diversificationScore = Math.min(100, Math.max(0, diversificationScore))
    }
  }

  const avgMomentum = funds.reduce((sum, f) => {
    const m3 = parseFloat(f.monthly_3_growth_rate || 0)
    const m1 = parseFloat(f.monthly_1_growth_rate || 0)
    return sum + (m3 + m1) / 2
  }, 0) / funds.length
  const momentumScore = Math.min(100, Math.max(0, 50 + avgMomentum * 2))

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

  const mergedFunds = funds.map(fund => {
    const riskInfo = riskData.find(r => r.code === fund.fund_code) || {}
    return {
      ...fund,
      volatility: riskInfo.volatilities?.[volatilityPeriod.value] || null,
      calculatedSharpe: riskInfo.sharpe_ratios?.[volatilityPeriod.value] || parseFloat(fund.sharpe || 0)
    }
  })

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
    
    const overallScore = Math.round(
      ((n - returnRank + 1) / n * 35 +
       (n - sharpeRank + 1) / n * 30 +
       (n - volatilityRank + 1) / n * 20 +
       (n - momentumRank + 1) / n * 15) * 100 / 100
    )

    let recommendation = { text: '持有观察', color: 'default' }
    if (overallScore >= 80) recommendation = { text: '强烈推荐', color: 'green' }
    else if (overallScore >= 60) recommendation = { text: '推荐', color: 'blue' }
    else if (overallScore >= 40) recommendation = { text: '持有观察', color: 'orange' }
    else recommendation = { text: '建议减持', color: 'red' }

    return { ...fund, returnRank, sharpeRank, volatilityRank, momentumRank, overallScore, recommendation }
  }).sort((a, b) => b.overallScore - a.overallScore)
})

// 核心建议
const coreRecommendations = computed(() => {
  const recs = []
  const funds = selectedFundsWithMetrics.value
  const metrics = healthMetrics.value
  const riskData = riskReturnData.value
  
  if (funds.length === 0) return recs

  if (metrics.total >= 70) {
    recs.push({
      type: 'positive',
      icon: '✨',
      title: '组合表现优异',
      description: `当前组合综合评分${metrics.total}分，各项指标均衡，建议保持现有配置。`
    })
  }

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
  }

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
  }

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

  const negativeReturnFunds = funds.filter(f => parseFloat(f.yearly_1_growth_rate || 0) < 0)
  if (negativeReturnFunds.length > 0) {
    alerts.push({
      level: 'warning',
      icon: '📉',
      title: `${negativeReturnFunds.length}只基金年度亏损`,
      description: `${negativeReturnFunds.map(f => f.fund_name.substring(0, 6)).join('、')} 近一年收益为负，建议关注。`
    })
  }

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

  const recentDropFunds = funds.filter(f => parseFloat(f.monthly_1_growth_rate || 0) < -5)
  if (recentDropFunds.length > funds.length / 2) {
    alerts.push({
      level: 'info',
      icon: '❄️',
      title: '近期整体回调',
      description: `超过半数基金近1月下跌超5%，市场可能处于调整期，建议观望或逢低布局。`
    })
  }

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
  
  if (healthGaugeChart) healthGaugeChart.dispose()
  
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
      itemStyle: { color: healthGrade.value.color },
      progress: { show: true, width: isMobile.value ? 15 : 20 },
      pointer: { show: false },
      axisLine: { lineStyle: { width: isMobile.value ? 15 : 20, color: [[1, '#e6e6e6']] } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      anchor: { show: false },
      title: {
        show: true,
        offsetCenter: [0, '25%'],
        fontSize: isMobile.value ? 12 : 14,
        color: '#666'
      },
      detail: {
        valueAnimation: true,
        width: '60%',
        lineHeight: 40,
        borderRadius: 8,
        offsetCenter: [0, '-10%'],
        fontSize: isMobile.value ? 24 : 32,
        fontWeight: 'bold',
        formatter: '{value}',
        color: healthGrade.value.color
      },
      data: [{ value: score, name: '健康度' }]
    }]
  })
}

// 初始化雷达图
function initRadarChart() {
  if (!radarChartRef.value) return
  
  if (radarChart) radarChart.dispose()
  
  radarChart = echarts.init(radarChartRef.value)
  const rankings = fundRankings.value.slice(0, 5)
  
  if (rankings.length === 0) {
    radarChart.setOption({ title: { text: '暂无数据', left: 'center', top: 'center' } })
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
    name: fund.fund_name.substring(0, isMobile.value ? 4 : 8),
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
      textStyle: { fontSize: isMobile.value ? 12 : 14 }
    },
    tooltip: { trigger: 'item' },
    legend: {
      type: 'scroll',
      bottom: 0,
      data: series.map(s => s.name),
      textStyle: { fontSize: isMobile.value ? 10 : 12 }
    },
    radar: {
      indicator: indicators,
      center: ['50%', '55%'],
      radius: isMobile.value ? '45%' : '60%',
      axisName: { fontSize: isMobile.value ? 10 : 12 }
    },
    series: [{ type: 'radar', data: series }],
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

// 格式化收益率
function formatRate(value) {
  if (value == null || value === '' || value === undefined) return '--'
  const num = parseFloat(value)
  if (isNaN(num)) return '--'
  return num >= 0 ? `+${num.toFixed(2)}%` : `${num.toFixed(2)}%`
}

// 格式化数字
function formatNumber(value) {
  if (value == null || value === '' || value === undefined) return '--'
  const num = parseFloat(value)
  if (isNaN(num)) return '--'
  return num.toFixed(2)
}

// AI分析功能
async function runAIAnalysis() {
  if (selectedFundCodes.value.length === 0) {
    message.warning('请先选择要分析的基金')
    return
  }
  
  // 如果已有分析结果，直接打开面板查看，不再重复分析
  if (aiAnalysisResult.value) {
    showAIPanel.value = true
    message.info('已有分析报告，点击右上角"重新AI分析"按钮可更新报告')
    return
  }
  
  showAIPanel.value = true
  aiAnalysisLoading.value = true
  // 不再清空之前的报告，保留结果直到用户点击"重新AI分析"
  
  console.log('AI分析开始，基金:', selectedFundCodes.value)
  
  try {
    const result = await fundAIApi.analyzeFund(selectedFundCodes.value, timeRange.value)
    console.log('AI分析返回:', result)
    if (result.success) {
      aiAnalysisResult.value = result.data
      console.log('AI分析结果设置:', aiAnalysisResult.value)
      message.success('AI分析完成')
    } else {
      message.error(result.error || '分析失败')
    }
  } catch (error) {
    console.error('AI分析失败:', error)
    message.error('AI分析失败: ' + error.message)
  } finally {
    aiAnalysisLoading.value = false
  }
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
    if (baseValue === null && item.net_value) baseValue = item.net_value
    if (baseValue && item.net_value) {
      const return_rate = ((item.net_value - baseValue) / baseValue * 100)
      result.push({ date: item.date, value: return_rate.toFixed(2) })
    }
  }
  
  return result
}

// 收益走势图表
function initTrendChart() {
  if (!trendChartRef.value) return
  
  if (trendChart) trendChart.dispose()
  
  trendChart = echarts.init(trendChartRef.value)
  const data = trendData.value
  const bmData = benchmarkData.value
  
  if ((!data || Object.keys(data).length === 0) && (!bmData || Object.keys(bmData).length === 0)) {
    trendChart.setOption({ title: { text: '暂无数据', left: 'center', top: 'center' } })
    return
  }

  const allDates = new Set()
  Object.values(data).forEach(fund => fund.data.forEach(item => allDates.add(item.date)))
  Object.values(bmData).forEach(index => index.data.forEach(item => allDates.add(item.date)))
  const dates = Array.from(allDates).sort()

  const series = Object.entries(data).map(([code, fund]) => {
    const cumulativeData = calculateCumulativeReturns(fund.data)
    const dataMap = new Map(cumulativeData.map(item => [item.date, item.value]))
    
    return {
      name: isMobile.value ? fund.fund_name.substring(0, 4) : fund.fund_name,
      type: 'line',
      smooth: true,
      symbol: 'none',
      data: dates.map(date => dataMap.get(date) || null)
    }
  })

  Object.entries(bmData).forEach(([code, index]) => {
    const indexData = index.data
    if (indexData.length > 0) {
      const baseClose = indexData[0].close
      const cumulativeData = indexData.map(item => ({
        date: item.date,
        value: baseClose ? ((item.close - baseClose) / baseClose * 100).toFixed(2) : null
      }))
      const dataMap = new Map(cumulativeData.map(item => [item.date, item.value]))
      
      series.push({
        name: isMobile.value ? index.index_name.substring(0, 4) : `📊 ${index.index_name}`,
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { type: 'dashed', width: 2 },
        data: dates.map(date => dataMap.get(date) || null)
      })
    }
  })

  trendChart.setOption({
    tooltip: { 
      trigger: 'axis',
      confine: isMobile.value,
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
      data: series.map(s => s.name),
      textStyle: { fontSize: isMobile.value ? 10 : 12 }
    },
    grid: { 
      left: isMobile.value ? '8%' : '3%', 
      right: isMobile.value ? '4%' : '4%', 
      bottom: isMobile.value ? '18%' : '15%', 
      top: '10%', 
      containLabel: true 
    },
    xAxis: { 
      type: 'category', 
      data: dates,
      axisLabel: { 
        formatter: (value) => dayjs(value).format(isMobile.value ? 'MM/DD' : 'MM-DD'),
        fontSize: isMobile.value ? 10 : 12
      }
    },
    yAxis: { 
      type: 'value', 
      name: isMobile.value ? '收益%' : '累计收益(%)',
      nameTextStyle: { fontSize: isMobile.value ? 10 : 12 },
      axisLabel: { 
        formatter: '{value}%',
        fontSize: isMobile.value ? 10 : 12
      }
    },
    series,
    color: ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16', '#8c8c8c', '#595959']
  })
}

// 风险收益散点图
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
    riskReturnChart.setOption({ title: { text: '暂无数据', left: 'center', top: 'center' } })
    return
  }

  const scatterData = funds.map(fund => ({
    name: fund.name,
    value: [
      fund.volatilities[volatilityPeriod.value] || 0,
      fund.returns[riskPeriod.value] || 0
    ],
    code: fund.code,
    itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.2)' }
  }))

  const volatilities = scatterData.map(d => d.value[0]).filter(v => v > 0)
  const returns = scatterData.map(d => d.value[1]).filter(v => v !== 0)
  
  const minVol = 0
  const maxVol = Math.max(...volatilities) * 1.3
  const minRet = Math.min(0, Math.min(...returns) * 1.2)
  const maxRet = Math.max(...returns) * 1.3

  const selectedAvgVol = selectedAvg.volatilities?.[volatilityPeriod.value]
  const selectedAvgRet = selectedAvg.returns?.[riskPeriod.value]
  const marketAvgRet = marketAvg[riskPeriod.value]
  const riskFreeRate = riskReturnData.value.risk_free_rate || 2.5

  const series = []
  
  if (selectedAvgVol && selectedAvgRet) {
    series.push({
      type: 'scatter',
      markArea: {
        silent: true,
        itemStyle: { color: 'transparent' },
        data: [
          [{ name: '理想区', xAxis: 0, yAxis: Math.max(selectedAvgRet, riskFreeRate), itemStyle: { color: 'rgba(82, 196, 26, 0.08)' } },
           { xAxis: selectedAvgVol, yAxis: maxRet }],
          [{ name: '进取区', xAxis: selectedAvgVol, yAxis: Math.max(selectedAvgRet, riskFreeRate), itemStyle: { color: 'rgba(24, 144, 255, 0.05)' } },
           { xAxis: maxVol, yAxis: maxRet }],
          [{ name: '保守区', xAxis: 0, yAxis: minRet, itemStyle: { color: 'rgba(150, 150, 150, 0.05)' } },
           { xAxis: selectedAvgVol, yAxis: Math.min(selectedAvgRet, riskFreeRate) }],
          [{ name: '危险区', xAxis: selectedAvgVol, yAxis: minRet, itemStyle: { color: 'rgba(245, 34, 45, 0.05)' } },
           { xAxis: maxVol, yAxis: Math.min(selectedAvgRet, riskFreeRate) }]
        ],
        label: { show: true, position: 'inside', fontSize: isMobile.value ? 9 : 11, fontWeight: 'bold', color: '#666' }
      }
    })
    
    series.push({
      type: 'line',
      markLine: {
        silent: true,
        symbol: ['none', 'none'],
        lineStyle: { type: 'dashed', width: 1.5 },
        data: [
          { xAxis: selectedAvgVol, lineStyle: { color: '#1890ff', opacity: 0.6 },
            label: { show: !isMobile.value, formatter: '平均波动率: {c}%', position: 'end', fontSize: 10, color: '#1890ff' } },
          { yAxis: selectedAvgRet, lineStyle: { color: '#1890ff', opacity: 0.6 },
            label: { show: !isMobile.value, formatter: '选中平均: {c}%', position: 'end', fontSize: 10, color: '#1890ff' } },
          { yAxis: marketAvgRet, lineStyle: { color: '#faad14', opacity: 0.8 },
            label: { show: !isMobile.value, formatter: '市场平均: {c}%', position: 'start', fontSize: 10, color: '#faad14' } },
          { yAxis: riskFreeRate, lineStyle: { color: '#52c41a', type: 'solid', opacity: 0.6, width: 2 },
            label: { show: !isMobile.value, formatter: `无风险利率: ${riskFreeRate}%`, position: 'start', fontSize: 10, color: '#52c41a', fontWeight: 'bold' } }
        ]
      }
    })
    
    const bestFund = riskReturnData.value.best_fund
    if (bestFund?.volatility > 0) {
      const slope = (bestFund.return - riskFreeRate) / bestFund.volatility
      series.push({
        name: '资本市场线',
        type: 'line',
        smooth: false,
        symbol: 'none',
        lineStyle: { color: '#722ed1', type: 'dotted', width: 2, opacity: 0.6 },
        data: [[0, riskFreeRate], [bestFund.volatility * 1.5, riskFreeRate + slope * bestFund.volatility * 1.5]],
        tooltip: { show: false }
      })
    }
  }
  
  series.push({
    type: 'scatter',
    symbolSize: (data) => {
      const ret = data[1]
      const vol = data[0]
      if (ret > (selectedAvgRet || 0) && vol < (selectedAvgVol || 20)) return isMobile.value ? 16 : 22
      if (ret > (selectedAvgRet || 0)) return isMobile.value ? 12 : 18
      return isMobile.value ? 10 : 14
    },
    data: scatterData,
    itemStyle: {
      color: (params) => {
        const ret = params.data.value[1]
        const vol = params.data.value[0]
        const avgRet = selectedAvgRet || 0
        const avgVol = selectedAvgVol || 20
        
        if (ret > avgRet && vol < avgVol) return '#52c41a'
        if (ret > avgRet && vol >= avgVol) return '#1890ff'
        if (ret <= avgRet && vol < avgVol) return '#faad14'
        return '#f5222d'
      },
      borderColor: '#fff',
      borderWidth: 2
    },
    emphasis: {
      scale: 1.5,
      itemStyle: { shadowBlur: 20, shadowColor: 'rgba(0, 0, 0, 0.3)' }
    },
    label: {
      show: !isMobile.value,
      formatter: (params) => {
        const ret = params.data.value[1]
        const vol = params.data.value[0]
        if (ret > (selectedAvgRet || 0) && vol < (selectedAvgVol || 20)) {
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
      subtext: isMobile.value ? `${volatilityPeriod.value} | ${riskPeriod.value}` : `波动率: ${volatilityPeriod.value} | 收益: ${riskPeriod.value} | 无风险利率: ${riskFreeRate}%`,
      left: 'center',
      top: 5,
      textStyle: { fontSize: isMobile.value ? 12 : 14, fontWeight: 'bold' },
      subtextStyle: { fontSize: isMobile.value ? 9 : 11, color: '#666' }
    },
    tooltip: {
      trigger: 'item',
      confine: isMobile.value,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#ddd',
      borderWidth: 1,
      textStyle: { color: '#333', fontSize: isMobile.value ? 11 : 12 },
      formatter: (params) => {
        if (params.componentType === 'markLine' || params.componentType === 'markArea') return params.name
        const data = params.data
        const ret = data.value[1]
        const vol = data.value[0]
        const fundCode = data.code
        const fundData = funds.find(f => f.code === fundCode)
        const sharpe = fundData?.sharpe_ratios?.[volatilityPeriod.value] || (vol > 0 ? ((ret - riskFreeRate) / vol).toFixed(2) : '--')
        
        let grade = ''
        if (ret > (selectedAvgRet || 0) && vol < (selectedAvgVol || 20)) grade = '⭐⭐⭐ 优秀'
        else if (ret > (selectedAvgRet || 0)) grade = '⭐⭐ 良好'
        else if (vol < (selectedAvgVol || 20)) grade = '⭐ 稳健'
        else grade = '⚠ 警惕'
        
        return `
          <div style="padding: 5px;">
            <div style="font-weight: bold; font-size: ${isMobile.value ? 12 : 14}px; margin-bottom: 8px; color: #1890ff;">${data.name}</div>
            <div style="margin: 3px 0;">📊 年化波动率: <strong>${vol.toFixed(2)}%</strong></div>
            <div style="margin: 3px 0;">📈 收益率: <strong style="color: ${ret >= 0 ? '#52c41a' : '#f5222d'};">${ret >= 0 ? '+' : ''}${ret.toFixed(2)}%</strong></div>
            <div style="margin: 3px 0;">📉 夏普比率: <strong>${sharpe}</strong></div>
            <div style="margin-top: 8px; padding-top: 5px; border-top: 1px solid #eee; color: #666; font-size: ${isMobile.value ? 10 : 12}px;">${grade}</div>
          </div>
        `
      }
    },
    legend: {
      data: ['基金', '资本市场线 (CML)'],
      bottom: 5,
      itemGap: 20,
      textStyle: { fontSize: isMobile.value ? 9 : 11 }
    },
    grid: { 
      left: isMobile.value ? '15%' : '12%', 
      right: '8%', 
      bottom: isMobile.value ? '15%' : '18%', 
      top: isMobile.value ? '22%' : '20%', 
      containLabel: true 
    },
    xAxis: { 
      type: 'value', 
      name: isMobile.value ? '波动率%' : '年化波动率 σ (%)',
      nameLocation: 'middle',
      nameGap: isMobile.value ? 25 : 30,
      nameTextStyle: { fontWeight: 'bold', fontSize: isMobile.value ? 10 : 12 },
      min: minVol,
      max: maxVol,
      axisLine: { lineStyle: { color: '#999' } },
      splitLine: { lineStyle: { type: 'dashed', color: '#eee' } },
      axisLabel: { formatter: '{value}%', fontSize: isMobile.value ? 9 : 11 }
    },
    yAxis: { 
      type: 'value', 
      name: isMobile.value ? '收益%' : '收益率 E(R) (%)',
      nameLocation: 'middle',
      nameGap: isMobile.value ? 30 : 40,
      nameTextStyle: { fontWeight: 'bold', fontSize: isMobile.value ? 10 : 12 },
      min: minRet,
      max: maxRet,
      axisLine: { lineStyle: { color: '#999' } },
      splitLine: { lineStyle: { type: 'dashed', color: '#eee' } },
      axisLabel: { formatter: '{value}%', fontSize: isMobile.value ? 9 : 11 }
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
    correlationData.value = { funds: [], matrix: [] }
    nextTick(() => initCorrelationChart())
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
    correlationData.value = { funds: [], matrix: [] }
  } finally {
    correlationLoading.value = false
    nextTick(() => initCorrelationChart())
  }
}

// 相关性热力图
function initCorrelationChart() {
  if (!correlationChartRef.value) return
  
  if (correlationChart) {
    correlationChart.dispose()
    correlationChart = null
  }
  
  const funds = correlationData.value.funds
  const matrix = correlationData.value.matrix
  
  if (!funds?.length || !matrix?.length) {
    correlationChart = echarts.init(correlationChartRef.value)
    correlationChart.setOption({ title: { text: '暂无数据', left: 'center', top: 'center' } })
    return
  }
  
  correlationChart = echarts.init(correlationChartRef.value)
  
  const names = funds.map(f => f.name.substring(0, isMobile.value ? 4 : 8))
  const data = []
  
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[i].length; j++) {
      data.push([i, j, parseFloat(matrix[i][j]).toFixed(2)])
    }
  }

  correlationChart.setOption({
    tooltip: { 
      position: 'top',
      confine: isMobile.value,
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
    grid: { 
      height: isMobile.value ? '55%' : '60%', 
      top: '10%', 
      left: isMobile.value ? '18%' : '15%', 
      right: '5%', 
      bottom: isMobile.value ? '25%' : '25%' 
    },
    xAxis: { 
      type: 'category', 
      data: names, 
      splitArea: { show: true },
      axisLabel: { rotate: isMobile.value ? 60 : 45, fontSize: isMobile.value ? 9 : 11 }
    },
    yAxis: { 
      type: 'category', 
      data: names, 
      splitArea: { show: true },
      axisLabel: { fontSize: isMobile.value ? 9 : 11 }
    },
    visualMap: {
      min: 0,
      max: 1,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '5%',
      itemWidth: isMobile.value ? 12 : 15,
      itemHeight: isMobile.value ? 80 : 100,
      textStyle: { fontSize: isMobile.value ? 9 : 10 },
      inRange: { color: ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b'] }
    },
    series: [{
      type: 'heatmap',
      data,
      label: { 
        show: true,
        formatter: (params) => params.data[2],
        fontSize: isMobile.value ? 9 : 11,
        fontWeight: 'bold'
      },
      emphasis: {
        itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' }
      }
    }]
  })
}

// 监听选择变化
watch(selectedFundCodes, () => {
  if (selectedFundCodes.value.length > 0) {
    loadTrendData()
    loadRiskReturnData()
    if (metricsViewMode.value === 'professional') loadProfessionalMetrics()
  }
  loadCorrelationData()
  nextTick(() => {
    initHealthGauge()
    initRadarChart()
  })
}, { deep: true })

// 监听基准指数选择变化
watch(selectedBenchmarks, () => {
  if (selectedFundCodes.value.length > 0) loadTrendData()
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
    if (response.success) benchmarkList.value = response.data
  } catch (error) {
    console.error('加载基准指数列表失败:', error)
  }
}

onMounted(() => {
  loadBenchmarkList()
  
  if (props.fundPool.length > 0) {
    // 使用备选池中的所有基金
    selectedFundCodes.value = props.fundPool.map(f => f.fund_code)
    loadTrendData()
    loadRiskReturnData()
    loadCorrelationData()
    nextTick(() => {
      initHealthGauge()
      initRadarChart()
    })
  }
})

// 监听 fundPool 变化，自动更新选中的基金
watch(() => props.fundPool, (newPool) => {
  if (newPool.length > 0) {
    // 更新选中的基金列表
    selectedFundCodes.value = newPool.map(f => f.fund_code)
    // 重新加载所有数据
    loadTrendData()
    loadRiskReturnData()
    loadCorrelationData()
    nextTick(() => {
      initHealthGauge()
      initRadarChart()
    })
  }
}, { deep: true, immediate: true })

// 窗口大小变化时重新渲染
window.addEventListener('resize', () => {
  trendChart?.resize()
  riskReturnChart?.resize()
  correlationChart?.resize()
  healthGaugeChart?.resize()
  radarChart?.resize()
})
</script>

<style scoped lang="less">
.fund-analysis {
  padding: 8px;
  
  @media (max-width: 768px) {
    padding: 4px;
  }

  // 基金选择卡片
  .selection-card {
    .selection-header {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      
      &.mobile {
        flex-direction: column;
        align-items: stretch;
        
        .label {
          margin-bottom: 4px;
        }
        
        .select-wrapper {
          width: 100%;
        }
        
        .action-btns {
          margin-top: 8px;
          justify-content: flex-end;
        }
      }
      
      .label {
        font-weight: 500;
        white-space: nowrap;
      }
    }
  }

  // 图表控制区
  .chart-controls {
    &.mobile {
      display: flex;
      justify-content: flex-end;
    }
  }

  // 移动端控制面板
  .mobile-controls {
    padding: 12px;
    background: #f5f5f5;
    border-radius:  8px;
    margin-bottom: 12px;
    
    .control-section {
      margin-bottom: 12px;
      
      .control-label {
        display: block;
        font-size: 12px;
        color: #666;
        margin-bottom: 6px;
      }
      
      :deep(.ant-radio-group) {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        
        .ant-radio-button-wrapper {
          flex: 1;
          min-width: 50px;
          text-align: center;
          padding: 0 8px;
          font-size: 12px;
        }
      }
    }
  }

  // 移动端专业指标控制面板
  .mobile-metrics-controls {
    padding: 12px;
    background: #f5f5f5;
    border-radius: 8px;
    margin-bottom: 12px;
    
    .control-section {
      margin-bottom: 12px;
      
      &:last-of-type {
        margin-bottom: 0;
      }
      
      .control-label {
        display: block;
        font-size: 12px;
        color: #666;
        margin-bottom: 6px;
        font-weight: 500;
      }
      
      :deep(.ant-select) {
        width: 100%;
      }
      
      :deep(.ant-radio-group) {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        width: 100%;
        
        .ant-radio-button-wrapper {
          flex: 1;
          min-width: 60px;
          text-align: center;
          padding: 0 8px;
          font-size: 12px;
        }
      }
    }
    
    :deep(.ant-btn) {
      margin-top: 8px;
    }
  }

  // 指标卡片
  .metrics-card {
    .metrics-title {
      display: flex;
      align-items: center;
      gap: 12px;
      
      &.mobile {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }
    }

    :deep(.ant-table-cell) {
      padding: 8px !important;
      
      @media (max-width: 768px) {
        padding: 6px 4px !important;
        font-size: 12px;
      }
    }

    .star-rating {
      color: #ffd666;
      font-size: 14px;
      letter-spacing: 1px;
      
      @media (max-width: 768px) {
        font-size: 12px;
      }
    }

    // 基准信息网格
    .benchmark-info {
      margin-top: 12px;
      padding: 12px;
      background: #fafafa;
      border-radius: 8px;

      .benchmark-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
        
        &.mobile {
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }
        
        .benchmark-item {
          display: flex;
          flex-direction: column;
          
          .label {
            font-size: 11px;
            color: #8c8c8c;
            margin-bottom: 2px;
          }
          
          .value {
            font-size: 13px;
            font-weight: 500;
            color: #262626;
          }
        }
      }

      .benchmark-warning {
        margin-top: 12px;
        padding: 8px 12px;
        background: #fff7e6;
        border-radius: 4px;
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;

        .warning-text {
          font-size: 12px;
          color: #666;
        }
      }
    }
  }

  // 图表卡片
  .chart-card {
    .chart {
      height: 350px;
      
      @media (max-width: 768px) {
        height: 280px;
      }
    }
    
    .chart-placeholder {
      height: 350px;
      display: flex;
      align-items: center;
      justify-content: center;
      
      @media (max-width: 768px) {
        height: 280px;
      }
    }
  }
  
  .risk-return-card {
    .chart {
      height: 480px;
      
      @media (max-width: 768px) {
        height: 300px;
      }
    }
  }

  // 基金单元格
  .fund-cell {
    .name {
      font-weight: 500;
      font-size: 13px;
      
      @media (max-width: 768px) {
        font-size: 12px;
      }
    }
    .code {
      font-size: 11px;
      color: #8c8c8c;
    }
  }

  // 文本样式
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

  // 智能分析报告样式
  .analysis-report-card {
    .report-title {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 16px;
      font-weight: 600;
      
      @media (max-width: 768px) {
        font-size: 14px;
        gap: 8px;
      }
    }

    .empty-analysis {
      padding: 40px 0;
      
      @media (max-width: 768px) {
        padding: 24px 0;
      }
    }

    .section-title {
      font-size: 15px;
      font-weight: 600;
      color: #262626;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      
      @media (max-width: 768px) {
        font-size: 13px;
        margin-bottom: 8px;
      }
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
        
        @media (max-width: 768px) {
          height: 150px;
        }
      }

      .health-details {
        width: 100%;
        padding: 0 16px;
        
        &.mobile {
          padding: 0 8px;
        }

        .detail-item {
          display: flex;
          align-items: center;
          margin-bottom: 8px;
          gap: 8px;

          .label {
            width: 70px;
            font-size: 12px;
            color: #666;
            flex-shrink: 0;
          }

          .score {
            font-size: 12px;
            font-weight: 500;
            color: #262626;
            min-width: 24px;
            text-align: right;
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
      
      @media (max-width: 768px) {
        height: 280px;
      }
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
      
      @media (max-width: 768px) {
        padding: 10px;
        gap: 8px;
        border-radius: 8px;
      }

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .metric-icon {
        font-size: 28px;
        
        @media (max-width: 768px) {
          font-size: 20px;
        }
      }

      .metric-content {
        flex: 1;
        min-width: 0;

        .metric-label {
          font-size: 12px;
          color: #8c8c8c;
          margin-bottom: 4px;
          
          @media (max-width: 768px) {
            font-size: 10px;
            margin-bottom: 2px;
          }
        }

        .metric-value {
          font-size: 14px;
          font-weight: 600;
          color: #262626;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          
          @media (max-width: 768px) {
            font-size: 12px;
          }
        }

        .metric-detail {
          font-size: 13px;
          font-weight: 500;
          margin-top: 2px;
          
          @media (max-width: 768px) {
            font-size: 11px;
          }
        }
      }

      &.best-return { border-left: 3px solid #ffd666; }
      &.best-sharpe { border-left: 3px solid #1890ff; }
      &.lowest-risk { border-left: 3px solid #52c41a; }
      &.best-momentum { border-left: 3px solid #f5222d; }
    }

    // 排名表格
    .ranking-section {
      .ranking-table {
        :deep(.ant-table-cell) {
          padding: 10px 8px !important;
          
          @media (max-width: 768px) {
            padding: 6px 4px !important;
          }
        }

        .fund-name-cell {
          .name {
            font-weight: 500;
            font-size: 13px;
            
            @media (max-width: 768px) {
              font-size: 11px;
            }
          }
          .code {
            font-size: 11px;
            color: #8c8c8c;
            
            @media (max-width: 768px) {
              font-size: 9px;
            }
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
        
        @media (max-width: 768px) {
          padding: 12px;
        }

        .group-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #262626;
          margin-bottom: 12px;
          
          @media (max-width: 768px) {
            font-size: 13px;
            margin-bottom: 10px;
          }

          .icon {
            font-size: 18px;
            
            @media (max-width: 768px) {
              font-size: 16px;
            }
          }
        }

        .recommendation-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          
          @media (max-width: 768px) {
            gap: 8px;
          }
        }

        .recommendation-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 6px;
          background: #fff;
          border-left: 3px solid transparent;
          
          @media (max-width: 768px) {
            padding: 8px 10px;
            gap: 8px;
          }

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
            
            @media (max-width: 768px) {
              font-size: 16px;
            }
          }

          .rec-content {
            flex: 1;
            min-width: 0;

            .rec-title {
              font-size: 13px;
              font-weight: 600;
              color: #262626;
              margin-bottom: 2px;
              
              @media (max-width: 768px) {
                font-size: 12px;
              }
            }

            .rec-desc {
              font-size: 12px;
              color: #666;
              line-height: 1.5;
              
              @media (max-width: 768px) {
                font-size: 11px;
                line-height: 1.4;
              }
            }
          }
        }

        .no-alerts, .no-recommendations {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          color: #52c41a;
          font-size: 14px;
          gap: 8px;
          
          @media (max-width: 768px) {
            padding: 16px;
            font-size: 12px;
          }
        }
        
        .no-recommendations {
          color: #8c8c8c;
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
        
        @media (max-width: 768px) {
          padding: 10px;
          margin-bottom: 8px;
        }

        &:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        &.high { border-left: 3px solid #f5222d; }
        &.medium { border-left: 3px solid #faad14; }
        &.low { border-left: 3px solid #1890ff; }

        .opt-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          flex-wrap: wrap;

          .opt-icon {
            font-size: 18px;
            
            @media (max-width: 768px) {
              font-size: 16px;
            }
          }

          .opt-title {
            flex: 1;
            font-size: 13px;
            font-weight: 600;
            color: #262626;
            
            @media (max-width: 768px) {
              font-size: 12px;
            }
          }
        }

        .opt-content {
          font-size: 12px;
          color: #666;
          line-height: 1.6;
          
          @media (max-width: 768px) {
            font-size: 11px;
            line-height: 1.5;
          }
        }
      }
    }
  }
}

// 全局卡片样式优化
:deep(.ant-card) {
  @media (max-width: 768px) {
    .ant-card-head {
      padding: 0 12px;
      min-height: 40px;
      
      .ant-card-head-title {
        font-size: 14px;
        padding: 8px 0;
      }
    }
    
    .ant-card-extra {
      padding: 8px 0;
    }
  }
}

// 表格滚动优化
:deep(.ant-table-wrapper) {
  .ant-table {
    font-size: 13px;
    
    @media (max-width: 768px) {
      font-size: 11px;
    }
  }
}

// AI分析面板样式
.ai-analysis-result {
  .ai-card {
    margin-bottom: 16px;
  }
  
  .score-display {
    display: flex;
    align-items: center;
    gap: 24px;
    
    .score-detail {
      div {
        margin: 4px 0;
      }
    }
  }
  
  // 多基金对比分析样式
  .fund-score-item {
    padding: 12px;
    margin-bottom: 12px;
    background: #fafafa;
    border-radius: 6px;
    
    &:last-child {
      margin-bottom: 0;
    }
    
    .fund-score-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
      
      .fund-code {
        font-weight: bold;
        font-size: 14px;
      }
    }
    
    .fund-name-info {
      display: flex;
      align-items: center;
      gap: 8px;
      
      .fund-name {
        font-weight: bold;
        font-size: 14px;
        color: #1890ff;
      }
    }
    
    .fund-scores {
      margin: 8px 0;
    }
    
    .fund-advantages,
    .fund-disadvantages {
      margin-top: 8px;
      
      .label {
        font-size: 12px;
        color: #666;
        margin-right: 8px;
        display: block;
        margin-bottom: 4px;
      }
      
      .tag-list {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }
    }
    
    .ai-info-item {
      margin: 8px 0;
      font-size: 13px;
      line-height: 1.5;
      
      .label {
        font-weight: bold;
        color: #333;
      }
    }
  }
  
  .analysis-meta {
    text-align: center;
    margin-top: 16px;
    color: #999;
  }
}
</style>
