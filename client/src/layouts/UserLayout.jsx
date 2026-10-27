import React, { useState, useMemo } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Badge, Button, Space, Typography, Drawer, Grid } from 'antd';
import {
  DashboardOutlined,
  CompassOutlined,
  CalendarOutlined,
  ToolOutlined,
  BookOutlined,
  LaptopOutlined,
  AlertOutlined,
  BellOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import StatusTag from '../components/StatusTag';

const { Header, Content, Footer } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

export const menus = {
  Student: ['dashboard', 'availability', 'devices', 'my-bookings', 'report-issue'],
  Lecturer: ['dashboard', 'availability', 'book-room', 'devices', 'my-bookings', 'report-issue'],
  Technician: ['dashboard', 'bookings', 'devices', 'reports'],
  Manager: ['dashboard', 'bookings', 'devices', 'reports', 'users', 'import', 'analytics'],
};

export default function UserLayout() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const screens = useBreakpoint();
  const isPhone = screens.md === false;
  const navigate = useNavigate();
  const location = useLocation();

  const roleKey = useMemo(() => {
    if (!user?.role) return 'Student';
    return user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase();
  }, [user]);

  // Define menu items definition
  const allMenuItems = useMemo(() => {
    const dashboardPath = user?.role === 'lecturer' ? '/lecturer' : '/student';
    return {
      dashboard: {
        key: dashboardPath,
        icon: <DashboardOutlined />,
        label: 'Dashboard',
      },
      availability: {
        key: '/map',
        icon: <CompassOutlined />,
        label: 'Floor Map & Availability',
      },
      'book-room': {
        key: '/calendar',
        icon: <CalendarOutlined />,
        label: 'Book Lab / Room',
      },
      devices: {
        key: '/devices',
        icon: <LaptopOutlined />,
        label: 'Borrow Devices',
      },
      'my-bookings': {
        key: '/my-activity',
        icon: <BookOutlined />,
        label: 'My Bookings',
      },
      'report-issue': {
        key: '/reports/new',
        icon: <AlertOutlined />,
        label: 'Report Damage',
      },
    };
  }, [user]);

  const allowedKeys = menus[roleKey] || menus.Student;
  const menuItems = allowedKeys.map(k => allMenuItems[k]).filter(Boolean);

  // Active menu key determination
  const selectedKeys = useMemo(() => {
    const current = location.pathname;
    const match = menuItems.find(item => {
      if (item.key === current) return true;
      if (current.startsWith(item.key) && item.key !== '/student' && item.key !== '/lecturer') return true;
      return false;
    });
    return match ? [match.key] : [menuItems[0]?.key || '/student'];
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
    <Layout style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      <Header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#FFFFFF',
          padding: '0 16px',
          borderBottom: '1px solid #E2E8F0',
          height: 64,
        }}
      >
        {/* Left side brand logo & phone-only hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isPhone && (
            <Button
              type="text"
              className="phone-only-trigger"
              icon={<MenuOutlined style={{ fontSize: 18, color: '#1E293B' }} />}
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open mobile navigation"
              style={{ padding: 4, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            />
          )}

          <Link to={user?.role === 'lecturer' ? '/lecturer' : '/student'} style={{ display: 'flex', alignItems: 'center', gap: 10, lineHeight: 'normal' }}>
            <img
              src="/logo-fsktm.png"
              alt="UTHM Logo"
              style={{ height: 34, objectFit: 'contain' }}
            />
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#0F172A', lineHeight: 1.2 }}>
                FMS <span style={{ color: '#1E3A8A' }}>Portal</span>
              </div>
              <div style={{ fontSize: 10, color: '#64748B', lineHeight: 1.2 }}>
                <span className="hidden sm:inline">Universiti Tun Hussein Onn Malaysia </span>(UTHM)
              </div>
            </div>
          </Link>
        </div>

        {/* Center Navigation Menu (Tablets & Desktops >= 768px) */}
        {!isPhone && (
          <div style={{ flex: 1, maxWidth: 680, margin: '0 24px' }} className="tablet-desktop-nav">
            <Menu
              mode="horizontal"
              selectedKeys={selectedKeys}
              items={menuItems}
              onClick={({ key }) => navigate(key)}
              style={{ borderBottom: 'none', fontWeight: 600 }}
            />
          </div>
        )}

        {/* Right side user menu */}
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
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </Avatar>
              <div className="hidden lg:flex" style={{ flexDirection: 'column', textAlign: 'left', lineHeight: 1.2 }}>
                <Text strong style={{ fontSize: 13, maxWidth: 130 }} ellipsis>
                  {user?.name}
                </Text>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {roleKey}
                </Text>
              </div>
            </div>
          </Dropdown>
        </Space>
      </Header>

      {/* Mobile/Tablet Navigation Drawer */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo-fsktm.png" alt="FSKTM" style={{ height: 30 }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#0F172A', lineHeight: 1.2 }}>
                FMS <span style={{ color: '#1E3A8A' }}>Portal</span>
              </div>
              <div style={{ fontSize: 10, color: '#64748B' }}>
                UTHM Faculty Portal
              </div>
            </div>
          </div>
        }
        placement="left"
        width={280}
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        styles={{ body: { padding: '12px 0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' } }}
      >
        <div>
          <div style={{ padding: '0 16px 12px 16px', borderBottom: '1px solid #F1F5F9', marginBottom: 8 }}>
            <div style={{ fontWeight: 700, color: '#1E293B', fontSize: 14 }}>{user?.name}</div>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 6 }}>{user?.matric_or_staff_id || user?.email}</div>
            <StatusTag status={user?.role} />
          </div>
          <Menu
            mode="inline"
            selectedKeys={selectedKeys}
            items={menuItems}
            onClick={({ key }) => {
              navigate(key);
              setMobileMenuOpen(false);
            }}
            style={{ borderRight: 'none', fontWeight: 600 }}
          />
        </div>
        <div style={{ padding: '16px', borderTop: '1px solid #F1F5F9' }}>
          <Button
            danger
            block
            icon={<LogoutOutlined />}
            onClick={() => {
              setMobileMenuOpen(false);
              logout();
            }}
          >
            Sign Out
          </Button>
        </div>
      </Drawer>

      {/* Centered Main Content Area */}
      <Content style={{ padding: '20px 14px', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
        <Outlet />
      </Content>

      <Footer style={{ textAlign: 'center', color: '#94A3B8', fontSize: 12, background: 'transparent', padding: '16px' }}>
        FSKTM Integrated Facility Booking & Maintenance System © {new Date().getFullYear()} Universiti Tun Hussein Onn Malaysia (UTHM)
      </Footer>
    </Layout>
  );
}
