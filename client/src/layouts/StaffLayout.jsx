import React, { useState, useMemo } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Badge, Button, Space, Typography, Grid, Drawer } from 'antd';
import {
  DashboardOutlined,
  CalendarOutlined,
  LaptopOutlined,
  AlertOutlined,
  ToolOutlined,
  TeamOutlined,
  UploadOutlined,
  BarChartOutlined,
  AppstoreOutlined,
  SettingOutlined,
  CompassOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MenuOutlined,
  BellOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import StatusTag from '../components/StatusTag';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

export default function StaffLayout() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const screens = useBreakpoint();
  const isPhone = screens.md === false;
  const navigate = useNavigate();
  const location = useLocation();

  const isManager = user?.role === 'manager';

  // Navigation Items according to ant-design-system.md
  const menuItems = useMemo(() => {
    const items = [
      {
        key: '/staff',
        icon: <DashboardOutlined />,
        label: 'Staff Dashboard',
      },
      {
        key: '/map',
        icon: <CompassOutlined />,
        label: 'Interactive Floor Map',
      },
      {
        key: '/calendar',
        icon: <CalendarOutlined />,
        label: 'Booking Calendar',
      },
      {
        key: '/tickets',
        icon: <AlertOutlined />,
        label: 'Breakdown Tickets',
      },
      {
        key: '/maintenance',
        icon: <ToolOutlined />,
        label: 'Maintenance Logs',
      },
      {
        key: '/devices/manage',
        icon: <LaptopOutlined />,
        label: 'Device Counter & Loans',
      },
      {
        key: '/rooms',
        icon: <AppstoreOutlined />,
        label: 'Room Facilities Control',
      },
    ];

    // Manager / Faculty Admin specific items
    if (isManager) {
      items.push(
        {
          type: 'divider',
        },
        {
          key: '/admin/schedule-import',
          icon: <UploadOutlined />,
          label: 'Timetable CSV Import',
        },
        {
          key: '/admin/users',
          icon: <TeamOutlined />,
          label: 'Users & Roles Admin',
        },
        {
          key: '/admin/reports',
          icon: <BarChartOutlined />,
          label: 'Reports & Analytics',
        },
        {
          key: '/admin/settings',
          icon: <SettingOutlined />,
          label: 'System Settings',
        }
      );
    }

    return items;
  }, [isManager]);

  const selectedKeys = useMemo(() => {
    const current = location.pathname;
    const match = menuItems.find(item => item.key && (item.key === current || current.startsWith(item.key) && item.key !== '/staff'));
    return match ? [match.key] : ['/staff'];
  }, [location.pathname, menuItems]);

  const userMenuItems = [
    {
      key: 'profile-info',
      disabled: true,
      label: (
        <div style={{ padding: '4px 0' }}>
          <div style={{ fontWeight: 600, color: '#111827' }}>{user?.name}</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            {user?.matric_or_staff_id || user?.email}
          </div>
          <div style={{ marginTop: 4 }}>
            <StatusTag status={user?.role} />
          </div>
        </div>
      ),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined style={{ color: '#dc2626' }} />,
      label: <span style={{ color: '#dc2626' }}>Sign Out</span>,
      onClick: () => logout(),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Desktop & Tablet Sider (>= 768px) */}
      {!isPhone && (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={(val) => setCollapsed(val)}
          trigger={null}
          width={250}
          collapsedWidth={80}
          style={{
            background: '#172554',
            position: 'sticky',
            top: 0,
            height: '100vh',
            zIndex: 101,
          }}
        >
          {/* Brand header */}
          <div
            style={{
              height: 64,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              overflow: 'hidden',
            }}
          >
            <img
              src="/logo-fsktm.png"
              alt="FSKTM Logo"
              style={{ height: 32, objectFit: 'contain', background: '#FFFFFF', borderRadius: 6, padding: 2 }}
            />
            {!collapsed && (
              <div style={{ color: '#FFFFFF', lineHeight: 1.2 }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>
                  FMS <span style={{ color: '#60A5FA' }}>Command</span>
                </div>
                <div style={{ fontSize: 10, color: '#93C5FD' }}>
                  {isManager ? 'Lab Manager' : 'Operations Desk'}
                </div>
              </div>
            )}
          </div>

          {/* Menu Items */}
          <div style={{ height: 'calc(100vh - 64px)', overflowY: 'auto' }}>
            <Menu
              theme="dark"
              mode="inline"
              selectedKeys={selectedKeys}
              items={menuItems}
              onClick={({ key }) => navigate(key)}
              style={{
                background: '#172554',
                borderRight: 'none',
                paddingTop: 8,
              }}
            />
          </div>
        </Sider>
      )}

      {/* Mobile & Tablet Drawer Navigation (< 1024px) */}
      <Drawer
        placement="left"
        width={280}
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        styles={{
          header: { background: '#172554', borderBottom: '1px solid rgba(255,255,255,0.1)' },
          body: { background: '#172554', padding: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' },
        }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img
              src="/logo-fsktm.png"
              alt="FSKTM"
              style={{ height: 32, background: '#FFFFFF', borderRadius: 6, padding: 2 }}
            />
            <div style={{ color: '#FFFFFF', lineHeight: 1.2 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>
                FMS <span style={{ color: '#60A5FA' }}>Command</span>
              </div>
              <div style={{ fontSize: 10, color: '#93C5FD' }}>
                {isManager ? 'Lab Manager' : 'Operations Desk'}
              </div>
            </div>
          </div>
        }
      >
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: 8 }}>
            <div style={{ color: '#FFFFFF', fontWeight: 600, fontSize: 14 }}>{user?.name}</div>
            <div style={{ color: '#93C5FD', fontSize: 12, marginBottom: 4 }}>{user?.matric_or_staff_id || user?.email}</div>
            <StatusTag status={user?.role} />
          </div>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={selectedKeys}
            items={menuItems}
            onClick={({ key }) => {
              navigate(key);
              setMobileDrawerOpen(false);
            }}
            style={{ background: '#172554', borderRight: 'none' }}
          />
        </div>
        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <Button
            danger
            block
            icon={<LogoutOutlined />}
            onClick={() => {
              setMobileDrawerOpen(false);
              logout();
            }}
          >
            Sign Out
          </Button>
        </div>
      </Drawer>

      <Layout>
        <Header
          style={{
            padding: '0 16px',
            background: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            height: 64,
          }}
        >
          <Space align="center" size="middle">
            <Button
              type="text"
              icon={isPhone ? <MenuOutlined /> : collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => {
                if (isPhone) {
                  setMobileDrawerOpen(true);
                } else {
                  setCollapsed(!collapsed);
                }
              }}
              style={{ fontSize: 16 }}
              aria-label="Toggle navigation menu"
            />
            <Text strong style={{ fontSize: 14, color: '#0F172A' }} className="hidden sm:inline">
              FSKTM Operational Console
            </Text>
          </Space>

          <Space size="middle" align="center">
            <Badge count={0} offset={[-2, 2]}>
              <Button
                type="text"
                icon={<BellOutlined style={{ fontSize: 18, color: '#475569' }} />}
                shape="circle"
                aria-label="Notifications"
              />
            </Badge>

            <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 6px', borderRadius: 8 }}>
                <Avatar
                  style={{ backgroundColor: '#1E3A8A', verticalAlign: 'middle', fontWeight: 700 }}
                  size={34}
                >
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
                </Avatar>
                <div className="hidden md:flex" style={{ flexDirection: 'column', textAlign: 'left', lineHeight: 1.2 }}>
                  <Text strong style={{ fontSize: 13, maxWidth: 140 }} ellipsis>
                    {user?.name}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {isManager ? 'Lab Manager' : 'Technician'}
                  </Text>
                </div>
              </div>
            </Dropdown>
          </Space>
        </Header>

        <Content
          style={{
            padding: isPhone ? '16px 12px' : '24px',
            minHeight: 280,
            background: '#F8FAFC',
            overflowY: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
