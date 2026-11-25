export const theme = {
  token: {
    colorPrimary: '#203F91',
    colorText: '#15213A',
    colorTextSecondary: '#52627A',
    colorBgLayout: '#F5F7FB',
    colorBorder: '#D9E0EA',
    colorSuccess: '#16A34A', // Available, Resolved
    colorWarning: '#F59E0B', // Maintenance, In Progress
    colorError: '#DC2626',   // Broken, Open
    colorInfo: '#2563EB',    // Booked
    borderRadius: 8,
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 14,
  },
  components: {
    Layout: {
      siderBg: '#152A61',
      headerBg: '#FFFFFF',
    },
    Menu: {
      darkItemBg: '#152A61',
      darkItemSelectedBg: '#203F91',
      darkItemHoverBg: 'rgba(255,255,255,0.09)',
    },
    Table: {
      headerBg: '#FFFFFF',
      cellPaddingBlock: 10,
      cellPaddingInline: 12,
    },
    Card: {
      paddingLG: 20,
    },
    Button: {
      controlHeight: 36,
      borderRadius: 8,
    },
    Modal: {
      borderRadiusLG: 12,
    },
  },
};
