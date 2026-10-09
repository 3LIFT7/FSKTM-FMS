export const theme = {
  token: {
    colorPrimary: '#1E3A8A',
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
      siderBg: '#172554',
      headerBg: '#FFFFFF',
    },
    Menu: {
      darkItemBg: '#172554',
      darkItemSelectedBg: '#1E3A8A',
    },
    Table: {
      headerBg: '#F8FAFC',
      cellPaddingBlock: 10,
      cellPaddingInline: 12,
    },
    Card: {
      paddingLG: 16,
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
