import React, { useState } from 'react';
import { Card, Upload, Button, Table, Alert, Progress, Space, Typography, Tag, Row, Col, message } from 'antd';
import {
  InboxOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  AlertOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import PageHeader from '../../components/PageHeader';
import StatusTag from '../../components/StatusTag';

const { Dragger } = Upload;
const { Text, Title, Paragraph } = Typography;

export default function ScheduleImport() {
  const [fileList, setFileList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  function handleDownloadTemplate() {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Course ID,Day,Start Time,End Time,Lab,Purpose\n' +
      'WIF2002,Monday,09:00,11:00,MSD,Operating Systems Lab Group 1\n' +
      'WIX1002,Tuesday,14:00,16:00,MINFO,Data Structures Lab Practical\n' +
      'WIE3001,Wednesday,10:00,12:00,CISCO,Advanced Networking Configuration\n' +
      'WIB7001,Thursday,15:00,17:00,SEM-2,Postgraduate Software Engineering Seminar\n' +
      'WIC2001,Friday,09:00,11:00,MTW,Web Technologies Frontend Lab\n';

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'fsktm_semester_schedule_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function handleUpload() {
    if (fileList.length === 0) {
      message.warning('Please select or drag a CSV file first');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', fileList[0].originFileObj || fileList[0]);

      const res = await fetch('/api/schedule/import-csv', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process CSV file');

      setResult(data);
      message.success('Timetable imported and scheduled successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const previewColumns = [
    {
      title: 'Course ID',
      dataIndex: 'course_id',
      key: 'course_id',
      render: (id) => <Tag color="cyan">{id}</Tag>,
    },
    {
      title: 'Facility',
      dataIndex: 'location_name',
      key: 'location_name',
    },
    {
      title: 'Day / Time',
      key: 'schedule',
      render: (_, record) => `${record.day || ''} ${record.start_time || ''} - ${record.end_time || ''}`,
    },
    {
      title: 'Purpose',
      dataIndex: 'purpose',
      key: 'purpose',
    },
    {
      title: 'Status',
      key: 'status',
      render: () => <StatusTag status="Approved" />,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Semester Timetable CSV Bulk Import"
        subtitle="Automatically populate recurring 14-week course bookings and laboratory schedules from faculty timetable files."
        extra={
          <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
            Download CSV Template
          </Button>
        }
      />

      {error && (
        <Alert
          type="error"
          message={error}
          showIcon
          closable
          onClose={() => setError('')}
        />
      )}

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={14}>
          <Card
            title="Upload CSV Schedule File"
            bordered={false}
            style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            <Dragger
              fileList={fileList}
              beforeUpload={(file) => {
                setFileList([file]);
                return false;
              }}
              onRemove={() => setFileList([])}
              maxCount={1}
              accept=".csv"
              style={{ padding: '32px 16px', background: '#F8FAFC', borderRadius: 12 }}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ fontSize: 48, color: '#1E3A8A' }} />
              </p>
              <p className="ant-upload-text" style={{ fontWeight: 700, color: '#0F172A' }}>
                Click or drag timetable CSV file to this area to upload
              </p>
              <p className="ant-upload-hint" style={{ color: '#64748B', fontSize: 12 }}>
                Supports standard comma-separated (.csv) files formatted with Course ID, Day, Start Time, End Time, Lab, and Purpose.
              </p>
            </Dragger>

            <div style={{ marginTop: 20, textAlign: 'right' }}>
              <Button
                type="primary"
                size="large"
                icon={<UploadOutlined />}
                loading={loading}
                disabled={fileList.length === 0}
                onClick={handleUpload}
                style={{ fontWeight: 600 }}
              >
                Execute Timetable Import
              </Button>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            title="Import Instructions & Format"
            bordered={false}
            style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            <Paragraph style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
              The CSV importer expands each valid course schedule row into a <strong>14-week recurring reservation series</strong> throughout the active semester.
            </Paragraph>

            <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 4, color: '#0F172A' }}>Required Header Columns:</div>
              <code style={{ color: '#1E3A8A' }}>Course ID, Day, Start Time, End Time, Lab, Purpose</code>
            </div>

            <div style={{ marginTop: 16 }}>
              <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                Conflict Policy:
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Slots with pre-existing reservations or rooms under maintenance are detected and flagged in the import report.
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Result Section */}
      {result && (
        <Card
          title={
            <Space>
              <CheckCircleOutlined style={{ color: '#16A34A' }} />
              <span>Import Execution Summary</span>
            </Space>
          }
          bordered={false}
          style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Progress
              percent={100}
              status="success"
              format={() => `${result.imported_count || result.count || 0} Slots Generated`}
            />

            <Alert
              type="success"
              showIcon
              message={result.message || 'Timetable imported successfully.'}
              description={`Successfully generated ${result.imported_count || result.count || 0} booking entries across 14 weeks.`}
            />

            {result.preview && result.preview.length > 0 && (
              <Table
                dataSource={result.preview}
                columns={previewColumns}
                rowKey={(r, idx) => idx}
                pagination={{ pageSize: 5 }}
                size="small"
                scroll={{ x: 'max-content' }}
              />
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
