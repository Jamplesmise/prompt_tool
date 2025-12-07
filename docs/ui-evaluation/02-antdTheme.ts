import type { ThemeConfig } from 'antd'

/**
 * Ant Design 主题配置
 * 品牌主色：红色系 (#EF4444)
 */
export const antdTheme: ThemeConfig = {
  token: {
    // 品牌主色
    colorPrimary: '#EF4444',
    colorPrimaryHover: '#DC2626',
    colorPrimaryActive: '#B91C1C',
    colorPrimaryBg: '#FEF2F2',
    colorPrimaryBgHover: '#FEE2E2',
    colorPrimaryBorder: '#FECACA',
    colorPrimaryBorderHover: '#FCA5A5',
    colorPrimaryText: '#DC2626',
    colorPrimaryTextHover: '#B91C1C',
    colorPrimaryTextActive: '#991B1B',

    // 语义色
    colorSuccess: '#10B981',
    colorWarning: '#F59E0B',
    colorError: '#EF4444',
    colorInfo: '#3B82F6',

    // 链接色
    colorLink: '#EF4444',
    colorLinkHover: '#DC2626',
    colorLinkActive: '#B91C1C',

    // 基础配置
    borderRadius: 6,
    fontSize: 14,
    fontSizeSM: 13,
    fontSizeLG: 16,
    fontSizeXL: 20,
    fontSizeHeading1: 38,
    fontSizeHeading2: 30,
    fontSizeHeading3: 24,
    fontSizeHeading4: 20,
    fontSizeHeading5: 16,

    // 圆角系统
    borderRadiusSM: 4,
    borderRadiusLG: 8,
    borderRadiusXS: 2,

    // 间距
    padding: 16,
    paddingSM: 12,
    paddingLG: 24,
    paddingXS: 8,
    paddingXXS: 4,

    margin: 16,
    marginSM: 12,
    marginLG: 24,
    marginXS: 8,
    marginXXS: 4,

    // 控件高度
    controlHeight: 32,
    controlHeightSM: 24,
    controlHeightLG: 40,

    // 阴影
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
    boxShadowSecondary: '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',

    // 动效
    motionDurationFast: '0.1s',
    motionDurationMid: '0.2s',
    motionDurationSlow: '0.3s',
  },
  components: {
    // 按钮
    Button: {
      fontSize: 14,
      fontSizeLG: 16,
      controlHeight: 32,
      controlHeightLG: 40,
      controlHeightSM: 24,
      borderRadius: 6,
      primaryShadow: '0 2px 8px rgba(239, 68, 68, 0.35)',
    },

    // 表格
    Table: {
      fontSize: 14,
      fontSizeSM: 13,
      headerBg: '#FAFAFA',
      headerColor: '#374151',
      rowHoverBg: '#FEF2F2',
      rowSelectedBg: '#FEE2E2',
      rowSelectedHoverBg: '#FECACA',
      borderColor: '#E5E7EB',
    },

    // 输入框
    Input: {
      fontSize: 14,
      activeBorderColor: '#EF4444',
      hoverBorderColor: '#FCA5A5',
      activeShadow: '0 0 0 2px rgba(239, 68, 68, 0.1)',
    },

    // 下拉选择
    Select: {
      fontSize: 14,
      optionSelectedBg: '#FEF2F2',
      optionSelectedColor: '#DC2626',
    },

    // 菜单
    Menu: {
      fontSize: 14,
      itemBg: 'transparent',
      itemSelectedBg: '#FEF2F2',
      itemSelectedColor: '#DC2626',
      itemHoverBg: '#F9FAFB',
      itemHoverColor: '#374151',
      itemActiveBg: '#FEE2E2',
      subMenuItemBg: 'transparent',
      darkItemSelectedBg: '#B91C1C',
    },

    // 卡片
    Card: {
      borderRadiusLG: 8,
      headerBg: 'transparent',
      actionsBg: '#FAFAFA',
    },

    // 标签页
    Tabs: {
      inkBarColor: '#EF4444',
      itemSelectedColor: '#DC2626',
      itemHoverColor: '#EF4444',
      itemActiveColor: '#B91C1C',
    },

    // 分页
    Pagination: {
      itemActiveBg: '#EF4444',
      itemActiveColor: '#FFFFFF',
      itemActiveBgDisabled: '#FEE2E2',
      itemActiveColorDisabled: '#FCA5A5',
    },

    // 进度条
    Progress: {
      defaultColor: '#EF4444',
      remainingColor: '#F3F4F6',
    },

    // 开关
    Switch: {
      colorPrimary: '#EF4444',
      colorPrimaryHover: '#DC2626',
    },

    // 复选框
    Checkbox: {
      colorPrimary: '#EF4444',
      colorPrimaryHover: '#DC2626',
    },

    // 单选框
    Radio: {
      colorPrimary: '#EF4444',
      colorPrimaryHover: '#DC2626',
    },

    // 标签
    Tag: {
      defaultBg: '#F3F4F6',
      defaultColor: '#374151',
    },

    // 模态框
    Modal: {
      borderRadiusLG: 12,
      titleFontSize: 18,
    },

    // 抽屉
    Drawer: {
      borderRadiusLG: 12,
    },

    // 消息
    Message: {
      contentBg: '#FFFFFF',
    },

    // 通知
    Notification: {
      width: 384,
    },

    // 排版
    Typography: {
      fontSize: 14,
      titleMarginBottom: '0.5em',
      titleMarginTop: '1.2em',
    },

    // 表单
    Form: {
      labelFontSize: 14,
      verticalLabelPadding: '0 0 8px',
    },

    // 日期选择
    DatePicker: {
      activeBorderColor: '#EF4444',
      hoverBorderColor: '#FCA5A5',
      activeShadow: '0 0 0 2px rgba(239, 68, 68, 0.1)',
    },

    // 布局
    Layout: {
      siderBg: '#FFFFFF',
      headerBg: '#FFFFFF',
      bodyBg: '#F5F5F5',
    },

    // 步骤条
    Steps: {
      colorPrimary: '#EF4444',
    },

    // 时间线
    Timeline: {
      dotBorderWidth: 2,
    },

    // 警告提示
    Alert: {
      borderRadiusLG: 8,
    },

    // 徽标
    Badge: {
      colorBgContainer: '#EF4444',
    },

    // 气泡确认框
    Popconfirm: {
      borderRadiusLG: 8,
    },

    // 工具提示
    Tooltip: {
      borderRadiusLG: 6,
    },
  },
}

export default antdTheme
