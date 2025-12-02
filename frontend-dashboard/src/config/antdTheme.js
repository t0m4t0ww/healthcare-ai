// src/config/antdTheme.js - Unified Design System Theme
// Ant Design v5 Theme Configuration

export const antdTheme = {
  token: {
    // 🎨 Primary Color - Emerald/Teal Gradient
    colorPrimary: '#10b981', // emerald-500
    colorSuccess: '#14b8a6', // teal-500
    colorWarning: '#f59e0b', // amber-500
    colorError: '#ef4444', // red-500
    colorInfo: '#3b82f6', // blue-500
    
    // 🎨 Secondary Colors
    colorLink: '#14b8a6', // teal-500
    colorTextBase: '#0f172a', // slate-900
    colorBgBase: '#ffffff', // white
    
    // 📐 Border Radius - Modern rounded corners
    borderRadius: 12,
    borderRadiusLG: 16,
    borderRadiusSM: 8,
    borderRadiusXS: 6,
    
    // 📏 Spacing
    padding: 16,
    paddingLG: 24,
    paddingSM: 12,
    paddingXS: 8,
    margin: 16,
    marginLG: 24,
    marginSM: 12,
    marginXS: 8,
    
    // 📝 Typography - Inter Font
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
    fontSize: 14,
    fontSizeLG: 16,
    fontSizeSM: 12,
    fontSizeHeading1: 38,
    fontSizeHeading2: 30,
    fontSizeHeading3: 24,
    fontSizeHeading4: 20,
    fontSizeHeading5: 16,
    fontWeightStrong: 600,
    
    // 📦 Component Sizes
    controlHeight: 40,
    controlHeightLG: 48,
    controlHeightSM: 32,
    
    // 🎭 Box Shadow - Modern elevation
    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    boxShadowSecondary: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    
    // 🌈 Motion
    motionDurationFast: '0.1s',
    motionDurationMid: '0.2s',
    motionDurationSlow: '0.3s',
    motionEaseInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    motionEaseOut: 'cubic-bezier(0, 0, 0.2, 1)',
    
    // 📱 Screen Breakpoints (sync với Ant Design defaults)
    screenXS: 480,
    screenSM: 576,
    screenMD: 768,
    screenLG: 992,
    screenXL: 1200,
    screenXXL: 1600,
  },
  
  // 🎨 Component-specific customizations
  components: {
    // Button
    Button: {
      controlHeight: 40,
      controlHeightLG: 48,
      controlHeightSM: 32,
      borderRadius: 12,
      fontWeight: 600,
      primaryShadow: '0 4px 6px -1px rgb(16 185 129 / 0.3)',
    },
    
    // Input
    Input: {
      controlHeight: 40,
      borderRadius: 12,
      paddingBlock: 10,
      paddingInline: 16,
    },
    
    // Card
    Card: {
      borderRadius: 16,
      boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
      headerBg: '#f9fafb', // slate-50
    },
    
    // Table
    Table: {
      borderRadius: 12,
      headerBg: '#f1f5f9', // slate-100
      headerColor: '#0f172a', // slate-900
      rowHoverBg: '#f0fdf4', // emerald-50
    },
    
    // Modal
    Modal: {
      borderRadius: 16,
      headerBg: 'transparent',
    },
    
    // Form
    Form: {
      labelFontSize: 14,
      labelColor: '#475569', // slate-600
      itemMarginBottom: 20,
    },
    
    // Menu
    Menu: {
      borderRadius: 12,
      itemBorderRadius: 10,
      itemSelectedBg: '#ecfdf5', // emerald-50
      itemSelectedColor: '#059669', // emerald-600
      itemActiveBg: '#d1fae5', // emerald-100
    },
    
    // Tabs
    Tabs: {
      inkBarColor: '#10b981', // emerald-500
      itemActiveColor: '#059669', // emerald-600
      itemHoverColor: '#10b981', // emerald-500
      itemSelectedColor: '#059669', // emerald-600
    },
    
    // DatePicker
    DatePicker: {
      borderRadius: 12,
      cellHoverBg: '#ecfdf5', // emerald-50
      cellActiveWithRangeBg: '#d1fae5', // emerald-100
    },
    
    // Select
    Select: {
      borderRadius: 12,
      optionSelectedBg: '#ecfdf5', // emerald-50
      optionActiveBg: '#d1fae5', // emerald-100
    },
    
    // Badge
    Badge: {
      dotSize: 8,
    },
    
    // Tag
    Tag: {
      borderRadius: 8,
      fontSizeSM: 12,
    },
    
    // Notification
    Notification: {
      width: 384,
      borderRadius: 12,
    },
    
    // Message
    Message: {
      borderRadius: 12,
    },
    
    // Drawer
    Drawer: {
      footerPaddingBlock: 16,
      footerPaddingInline: 24,
    },
    
    // Timeline
    Timeline: {
      tailColor: '#e2e8f0', // slate-200
      dotBg: '#ffffff',
      dotBorderWidth: 2,
    },
    
    // Steps
    Steps: {
      iconSize: 32,
      dotSize: 12,
    },
    
    // Progress
    Progress: {
      defaultColor: '#10b981', // emerald-500
      remainingColor: '#e5e7eb', // gray-200
    },
    
    // Alert
    Alert: {
      borderRadius: 12,
      withDescriptionPadding: 16,
    },
  },
  
  // 🌙 Algorithm for dark mode (optional)
  algorithm: undefined, // Will be set dynamically based on theme
};

// 🌙 Dark Theme Configuration
export const darkTheme = {
  ...antdTheme,
  token: {
    ...antdTheme.token,
    colorTextBase: '#f1f5f9', // slate-100
    colorBgBase: '#0f172a', // slate-900
    colorBgContainer: '#1e293b', // slate-800
    colorBgElevated: '#334155', // slate-700
    colorBorder: '#475569', // slate-600
    colorBorderSecondary: '#64748b', // slate-500
  },
};

// 🎨 Helper function to get theme based on mode
export const getAntdTheme = (isDark = false) => {
  return isDark ? darkTheme : antdTheme;
};

