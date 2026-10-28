import React, { useState, useEffect, useMemo } from 'react';
import { Card, Table, Button, Input, Select, Modal, Form, Space, Typography, Tag, Row, Col, Empty, message } from 'antd';
import {
  TeamOutlined,
  UserAddOutlined,
  SearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import StatusTag from '../../components/StatusTag';
import PageHeader from '../../components/PageHeader';

const { Text } = Typography;

export default function UsersManage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [addForm] = Form.useForm();

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', { credentials: 'include' });
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers(data.users || []);
      } else {
        console.error('fetchUsers failed:', data);
        message.error(data.error || 'Failed to load user accounts');
      }
    } catch (err) {
      console.error(err);
      message.error('Failed to load user accounts');
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(userId, newRole) {
    setUpdatingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      message.success('User role updated successfully');
      fetchUsers();
    } catch (err) {
      message.error(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleCreateUser(values) {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: values.name.trim(),
          email: values.email.trim().toLowerCase(),
          password: values.password,
          role: values.role,
          matric_or_staff_id: values.id ? values.id.trim().toUpperCase() : null,
          department: values.department || 'Software Engineering',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      message.success('New user account provisioned');
      setIsAddUserOpen(false);
      addForm.resetFields();
      fetchUsers();
    } catch (err) {
      message.error(err.message);
    }
  }

  const filteredUsers = useMemo(() => {
    return [...users]
      .sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (dateB !== dateA) return dateB - dateA;
        return (b.user_id || 0) - (a.user_id || 0);
      })
      .filter(u => {
        if (roleFilter !== 'All' && u.role !== roleFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            u.name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            (u.matric_or_staff_id && u.matric_or_staff_id.toLowerCase().includes(q))
          );
        }
        return true;
      });
  }, [users, roleFilter, search]);

  const columns = [
    {
      title: 'Full Name',
      dataIndex: 'name',
      key: 'name',
      render: (name) => <Text strong>{name}</Text>,
    },
    {
      title: 'Email Address',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Matric / Staff ID',
      dataIndex: 'matric_or_staff_id',
      key: 'matric_or_staff_id',
      render: (id) => (id ? <Text code>{id}</Text> : '-'),
    },
    {
      title: 'Role Authorization',
      key: 'role',
      width: 170,
      render: (_, record) => (
        <Select
          size="small"
          value={record.role}
          loading={updatingId === record.user_id}
          onChange={(newRole) => handleRoleChange(record.user_id, newRole)}
          style={{ width: '100%' }}
          options={[
            { value: 'student', label: 'Student' },
            { value: 'lecturer', label: 'Lecturer' },
            { value: 'technician', label: 'Technician' },
            { value: 'manager', label: 'Manager / Admin' },
          ]}
        />
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="User Accounts & Role Permissions"
        subtitle="Manage faculty user directory, authorize role transitions, and provision technical staff accounts."
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchUsers}>
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={() => setIsAddUserOpen(true)}
              style={{ fontWeight: 600 }}
            >
              Provision New User
            </Button>
          </Space>
        }
      />

      <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Input
                prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
                placeholder="Search users by name, email, or matric/staff ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                allowClear
              />
            </Col>
            <Col xs={12} md={6}>
              <Select
                style={{ width: '100%' }}
                value={roleFilter}
                onChange={setRoleFilter}
                options={[
                  { value: 'All', label: 'All Roles' },
                  { value: 'student', label: 'Students Only' },
                  { value: 'lecturer', label: 'Lecturers Only' },
                  { value: 'technician', label: 'Technicians Only' },
                  { value: 'manager', label: 'Lab Managers Only' },
                ]}
              />
            </Col>
            <Col xs={12} md={6} style={{ textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Showing <strong>{filteredUsers.length}</strong> registered users
              </Text>
            </Col>
          </Row>

          <Table
            dataSource={filteredUsers}
            columns={columns}
            rowKey="user_id"
            loading={loading}
            pagination={{ pageSize: 8 }}
            locale={{ emptyText: <Empty description="No users found" /> }}
            size="small"
          />
        </div>
      </Card>

      {/* Provision User Modal */}
      <Modal
        open={isAddUserOpen}
        onCancel={() => setIsAddUserOpen(false)}
        footer={null}
        destroyOnClose
        centered
        title="Provision Faculty User Account"
      >
        <Form
          form={addForm}
          layout="vertical"
          onFinish={handleCreateUser}
          initialValues={{ role: 'student', department: 'Software Engineering' }}
          style={{ marginTop: 16 }}
        >
          <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="email" label="University Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>

          <Form.Item name="password" label="Temporary Password" rules={[{ required: true, min: 6 }]}>
            <Input.Password placeholder="Min. 6 characters" />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="role" label="Account Role" rules={[{ required: true }]}>
              <Select>
                <Select.Option value="student">Student</Select.Option>
                <Select.Option value="lecturer">Lecturer</Select.Option>
                <Select.Option value="technician">Technician</Select.Option>
                <Select.Option value="manager">Manager / Admin</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item name="id" label="Matric / Staff ID">
              <Input style={{ textTransform: 'uppercase' }} />
            </Form.Item>
          </div>

          <Form.Item style={{ marginBottom: 0, marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <Button onClick={() => setIsAddUserOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                Provision Account
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
