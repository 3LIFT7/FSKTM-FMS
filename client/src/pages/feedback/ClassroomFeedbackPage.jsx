import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Card,
  Tabs,
  Form,
  Input,
  Button,
  Rate,
  Upload,
  Alert,
  Tag,
  Typography,
  Space,
  Row,
  Col,
  Result,
  Spin,
  Divider,
  Switch,
  Badge,
  message,
  Timeline,
  DatePicker,
  TimePicker,
  Checkbox,
  InputNumber
} from 'antd';
import {
  AlertOutlined,
  StarOutlined,
  CalendarOutlined,
  CameraOutlined,
  UploadOutlined,
  CompassOutlined,
  UserOutlined,
  MailOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ToolOutlined,
  FireOutlined,
  SmileOutlined,
  ThunderboltOutlined,
  LaptopOutlined,
  BulbOutlined,
  AppstoreOutlined,
  QrcodeOutlined,
  IdcardOutlined,
  BookOutlined,
  RightOutlined
} from '@ant-design/icons';
import confetti from 'canvas-confetti';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import StatusTag from '../../components/StatusTag';
import { formatDateTime } from '../../utils/date';

const { Title, Text, Paragraph } = Typography;

const DEFECT_CATEGORIES = [
  { key: 'Air Conditioning', label: 'Air Conditioning', icon: '❄️', color: '#0284C7' },
  { key: 'Projector & AV', label: 'Projector & AV', icon: '📽️', color: '#7C3AED' },
  { key: 'Electrical & Sockets', label: 'Power Sockets', icon: '⚡', color: '#D97706' },
  { key: 'PC & Hardware', label: 'Computer / PC', icon: '💻', color: '#2563EB' },
  { key: 'Lighting', label: 'Room Lighting', icon: '💡', color: '#EAB308' },
  { key: 'Furniture & Chairs', label: 'Furniture / Chair', icon: '🪑', color: '#4B5563' },
  { key: 'Cleanliness', label: 'Cleanliness', icon: '🧹', color: '#059669' },
  { key: 'General Defect', label: 'Other Defect', icon: '🛠️', color: '#DC2626' },
];

export default function ClassroomFeedbackPage() {
  const { codeOrId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const locationState = useLocation();
  const targetIdOrCode = codeOrId || searchParams.get('code') || searchParams.get('location_id') || 'DT2';

  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [roomData, setRoomData] = useState(null);
  const [error, setError] = useState('');
  const initialTab = searchParams.get('tab') || 'book';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Room Booking Form State
  const [bookForm] = Form.useForm();
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [submittedBooking, setSubmittedBooking] = useState(null);
  const [bookingError, setBookingError] = useState('');
  const [isRecurringBooking, setIsRecurringBooking] = useState(false);

  // Issue Reporting Form State
  const [issueForm] = Form.useForm();
  const [selectedCategory, setSelectedCategory] = useState('Air Conditioning');
  const [fileList, setFileList] = useState([]);
  const [submittingIssue, setSubmittingIssue] = useState(false);
  const [submittedIssueTicket, setSubmittedIssueTicket] = useState(null);

  // Feedback Form State
  const [feedbackForm] = Form.useForm();
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [submittedFeedback, setSubmittedFeedback] = useState(null);
  const [isAnonymous, setIsAnonymous] = useState(false);

  useEffect(() => {
    fetchRoomDetails();
  }, [targetIdOrCode]);

  async function fetchRoomDetails() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/feedback/location/${encodeURIComponent(targetIdOrCode)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Classroom details could not be found.');
      setRoomData(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Handle Defect Submission
  const handleIssueSubmit = async (values) => {
    setSubmittingIssue(true);
    try {
      const formData = new FormData();
      formData.append('location_id', roomData.location.location_id);
      formData.append('description', values.description);
      formData.append('category', selectedCategory);

      if (user) {
        // Authenticated user
        formData.append('guest_name', user.name);
        formData.append('guest_email', user.email);
      } else {
        formData.append('guest_name', values.reporter_name || 'Classroom Guest/Student');
        formData.append('guest_email', values.reporter_email || '');
      }

      if (fileList.length > 0 && fileList[0].originFileObj) {
        formData.append('photo', fileList[0].originFileObj);
      }

      const res = await fetch('/api/issues', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit report');

      // Trigger celebration confetti
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      setSubmittedIssueTicket(data.report);
      issueForm.resetFields();
      setFileList([]);
      fetchRoomDetails();
      message.success('Breakdown report logged! Technicians have been notified.');
    } catch (err) {
      message.error(err.message);
    } finally {
      setSubmittingIssue(false);
    }
  };

  // Handle Classroom Rating & Feedback Submission
  const handleFeedbackSubmit = async (values) => {
    setSubmittingFeedback(true);
    try {
      const payload = {
        location_id: roomData.location.location_id,
        rating: values.rating || 5,
        cleanliness_rating: values.cleanliness_rating || 5,
        equipment_rating: values.equipment_rating || 5,
        ac_rating: values.ac_rating || 5,
        category: values.category || 'General',
        comments: values.comments,
        reporter_name: isAnonymous ? 'Anonymous' : (user?.name || values.reporter_name || 'Student'),
        reporter_email: isAnonymous ? null : (user?.email || values.reporter_email || null),
        reporter_role: user?.role || 'student'
      };

      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit feedback');

      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      setSubmittedFeedback(data.feedback);
      feedbackForm.resetFields();
      fetchRoomDetails();
      message.success('Thank you for your feedback!');
    } catch (err) {
      message.error(err.message);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Handle Room Reservation Submission
  const handleBookingSubmit = async (values) => {
    setBookingError('');
    setSubmittingBooking(true);
    try {
      const dateStr = values.date.format('YYYY-MM-DD');
      const startStr = values.startTime.format('HH:mm:00');
      const endStr = values.endTime.format('HH:mm:00');
      const startDateTime = new Date(`${dateStr}T${startStr}`);
      const endDateTime = new Date(`${dateStr}T${endStr}`);

      if (endDateTime <= startDateTime) {
        throw new Error('End time must be after start time.');
      }

      const payload = {
        location_id: roomData.location.location_id,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        purpose: values.purpose,
        course_id: values.course_id || null,
        is_recurring: Boolean(values.is_recurring),
        weeks: values.weeks || 14
      };

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit room reservation.');

      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      setSubmittedBooking(data.booking || data.bookings?.[0] || {
        ...payload,
        status: user?.role === 'technician' || user?.role === 'manager' ? 'approved' : 'pending'
      });
      bookForm.resetFields();
      fetchRoomDetails();
      message.success('Classroom reservation submitted successfully!');
    } catch (err) {
      setBookingError(err.message);
      message.error(err.message);
    } finally {
      setSubmittingBooking(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
        <Paragraph style={{ marginTop: 16, color: '#64748B' }}>Connecting to Classroom Portal...</Paragraph>
      </div>
    );
  }

  if (error || !roomData) {
    return (
      <div style={{ maxWidth: 500, margin: '60px auto', padding: '0 20px' }}>
        <Result
          status="404"
          title="Classroom Not Found"
          subTitle={error || `Could not find a facility matching "${targetIdOrCode}".`}
          extra={
            <Link to="/map">
              <Button type="primary">Explore Interactive Map</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const { location, summary, issues = [], feedbacks = [], todays_bookings = [] } = roomData;

  return (
    <div
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '16px 14px 60px 14px',
        fontFamily: "'Inter', sans-serif"
      }}
    >
      {/* Top Mobile Faculty Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          padding: '8px 4px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: 14
            }}
          >
            FSKTM
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#1E3A8A', lineHeight: 1.2 }}>
              FSKTM SMART FACILITY
            </div>
            <div style={{ fontSize: 11, color: '#64748B' }}>
              Universiti Malaya • Quick QR Portal
            </div>
          </div>
        </div>

        {user ? (
          <Tag color="green" style={{ borderRadius: 12, fontWeight: 600 }}>
            <UserOutlined style={{ marginRight: 4 }} />
            {user.name.split(' ')[0]} ({user.role})
          </Tag>
        ) : (
          <Button
            size="small"
            type="primary"
            onClick={() => navigate('/login/student', { state: { from: locationState } })}
            style={{ fontSize: 12, borderRadius: 8, fontWeight: 700, background: '#1E3A8A' }}
          >
            Sign In
          </Button>
        )}
      </div>

      {/* Classroom Hero Card */}
      <Card
        style={{
          borderRadius: 20,
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 70%, #1E3A8A 100%)',
          color: '#FFFFFF',
          border: 'none',
          boxShadow: '0 12px 28px rgba(15, 23, 42, 0.25)',
          marginBottom: 20
        }}
        bodyStyle={{ padding: '20px 22px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <Space size={6} wrap style={{ marginBottom: 6 }}>
              <Tag
                color="blue"
                style={{
                  background: '#3B82F6',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: 13,
                  border: 'none',
                  padding: '2px 10px',
                  borderRadius: 6
                }}
              >
                {location.code}
              </Tag>
              <Tag
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: 6
                }}
              >
                {location.category || 'Classroom'}
              </Tag>
              <StatusTag status={location.status} />
            </Space>

            <Title level={2} style={{ color: '#FFFFFF', margin: '4px 0 6px 0', fontWeight: 800, fontSize: 'clamp(20px, 5vw, 26px)' }}>
              {location.name}
            </Title>

            <div style={{ color: '#93C5FD', fontSize: 13, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <span>
                <CompassOutlined style={{ marginRight: 4 }} />
                {location.floor?.startsWith('Blok') ? location.floor : `Floor ${location.floor}`}
              </span>
              {location.capacity && (
                <span>• Capacity: <strong>{location.capacity} seats</strong></span>
              )}
            </div>
          </div>

          {/* Average Rating Capsule */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(10px)',
              borderRadius: 14,
              padding: '10px 16px',
              textAlign: 'center',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
              <StarOutlined style={{ color: '#FBBF24', fontSize: 18 }} />
              <span style={{ fontSize: 20, fontWeight: 900, color: '#FFFFFF' }}>
                {summary.average_rating > 0 ? summary.average_rating.toFixed(1) : '5.0'}
              </span>
            </div>
            <div style={{ fontSize: 10, color: '#CBD5E1', marginTop: 2 }}>
              {summary.total_feedback} feedback reviews
            </div>
          </div>
        </div>

        {/* Maintenance / Unresolved Issues Warning Banner */}
        {location.status === 'maintenance' && (
          <Alert
            type="warning"
            showIcon
            style={{ marginTop: 16, borderRadius: 10, background: 'rgba(245, 158, 11, 0.2)', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#FEF3C7' }}
            message={<span style={{ fontWeight: 700, color: '#FEF3C7' }}>Room Currently Under Maintenance</span>}
            description={<span style={{ color: '#FDE68A', fontSize: 12 }}>Technicians are currently working in this facility. Some equipment may be offline.</span>}
          />
        )}
      </Card>

      {/* Main Tabs: Report Issue | Room Feedback | Timetable | Activity */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        style={{
          background: '#FFFFFF',
          borderRadius: 16,
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
          padding: '12px 16px 24px 16px'
        }}
        items={[
          {
            key: 'book',
            label: (
              <span style={{ fontWeight: 700, color: activeTab === 'book' ? '#16A34A' : undefined }}>
                <CalendarOutlined style={{ color: '#16A34A' }} />
                <span>Book Classroom</span>
              </span>
            ),
            children: (
              <div style={{ paddingTop: 8 }}>
                {submittedBooking ? (
                  <Result
                    status="success"
                    title="Room Reservation Submitted!"
                    subTitle={
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>
                          {location.name} ({location.code})
                        </div>
                        <Space size={6} wrap style={{ marginBottom: 12 }}>
                          <Tag color={user?.role === 'technician' || user?.role === 'manager' ? 'green' : 'gold'} style={{ fontWeight: 700 }}>
                            {user?.role === 'technician' || user?.role === 'manager' ? '✓ CONFIRMED (STAFF)' : '⏳ PENDING ADMINISTRATIVE APPROVAL'}
                          </Tag>
                          {submittedBooking.is_recurring && (
                            <Tag color="purple">Weekly Recurring ({submittedBooking.weeks || 14} Weeks)</Tag>
                          )}
                        </Space>
                        <div style={{ fontSize: 13, color: '#64748B' }}>
                          Your room reservation has been recorded in the faculty reservation system.
                        </div>
                      </div>
                    }
                    extra={[
                      <Button
                        key="another"
                        type="primary"
                        onClick={() => setSubmittedBooking(null)}
                        style={{ fontWeight: 600, background: '#16A34A', borderColor: '#16A34A' }}
                      >
                        Reserve Another Slot
                      </Button>,
                      <Button key="schedule" onClick={() => setActiveTab('schedule')}>
                        View Today's Schedule
                      </Button>,
                      <Button key="my" onClick={() => navigate('/my-activity')}>
                        My Bookings & Activity
                      </Button>
                    ]}
                  />
                ) : location.status === 'maintenance' ? (
                  <Alert
                    type="error"
                    showIcon
                    style={{ borderRadius: 12, padding: 16 }}
                    message={<span style={{ fontWeight: 700 }}>Reservations Temporarily Paused</span>}
                    description={
                      <div>
                        {location.name} is currently undergoing technical maintenance. New reservations cannot be placed until maintenance is resolved.
                      </div>
                    }
                  />
                ) : user ? (
                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <Text strong style={{ fontSize: 14 }}>
                        Instant Booking for {location.name} ({location.code})
                      </Text>
                      <Paragraph type="secondary" style={{ fontSize: 12, margin: '2px 0 12px 0' }}>
                        Reserve this classroom for study sessions, club events, project presentations, or makeup lectures.
                      </Paragraph>
                    </div>

                    {bookingError && (
                      <Alert
                        type="error"
                        message={bookingError}
                        showIcon
                        closable
                        onClose={() => setBookingError('')}
                        style={{ marginBottom: 16, borderRadius: 8 }}
                      />
                    )}

                    <Form
                      form={bookForm}
                      layout="vertical"
                      onFinish={handleBookingSubmit}
                      initialValues={{
                        date: dayjs(),
                        startTime: dayjs().hour(9).minute(0),
                        endTime: dayjs().hour(11).minute(0),
                        weeks: 14
                      }}
                    >
                      <Row gutter={12}>
                        <Col xs={24} sm={12}>
                          <Form.Item
                            name="date"
                            label={<span style={{ fontWeight: 600 }}>Booking Date</span>}
                            rules={[{ required: true, message: 'Please select a date' }]}
                          >
                            <DatePicker
                              style={{ width: '100%', borderRadius: 8 }}
                              format="DD/MM/YYYY"
                              disabledDate={(cur) => cur && cur < dayjs().startOf('day')}
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={12} sm={6}>
                          <Form.Item
                            name="startTime"
                            label={<span style={{ fontWeight: 600 }}>Start Time</span>}
                            rules={[{ required: true, message: 'Start time required' }]}
                          >
                            <TimePicker format="HH:mm" minuteStep={15} style={{ width: '100%', borderRadius: 8 }} />
                          </Form.Item>
                        </Col>
                        <Col xs={12} sm={6}>
                          <Form.Item
                            name="endTime"
                            label={<span style={{ fontWeight: 600 }}>End Time</span>}
                            rules={[{ required: true, message: 'End time required' }]}
                          >
                            <TimePicker format="HH:mm" minuteStep={15} style={{ width: '100%', borderRadius: 8 }} />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Form.Item
                        name="purpose"
                        label={<span style={{ fontWeight: 600 }}>Session Purpose & Event Details</span>}
                        rules={[{ required: true, message: 'Please state the booking purpose' }]}
                      >
                        <Input.TextArea
                          rows={3}
                          placeholder="e.g. FYP project discussion, Study group, Workshop, Student society meeting"
                          style={{ borderRadius: 8 }}
                        />
                      </Form.Item>

                      <Row gutter={12}>
                        <Col xs={24} sm={12}>
                          <Form.Item name="course_id" label={<span style={{ fontWeight: 600 }}>Course / Subject Code (Optional)</span>}>
                            <Input placeholder="e.g. WIX1002 / BIC21203" style={{ borderRadius: 8 }} />
                          </Form.Item>
                        </Col>
                        {(user.role === 'lecturer' || user.role === 'manager') && (
                          <Col xs={24} sm={12}>
                            <Form.Item
                              name="is_recurring"
                              valuePropName="checked"
                              style={{ marginTop: 28 }}
                            >
                              <Checkbox onChange={(e) => setIsRecurringBooking(e.target.checked)}>
                                <span style={{ fontWeight: 600 }}>Repeat Weekly Throughout Semester</span>
                              </Checkbox>
                            </Form.Item>
                          </Col>
                        )}
                      </Row>

                      {isRecurringBooking && (user.role === 'lecturer' || user.role === 'manager') && (
                        <Form.Item
                          name="weeks"
                          label={<span style={{ fontWeight: 600 }}>Number of Recurring Weeks</span>}
                          rules={[{ required: true }]}
                        >
                          <InputNumber min={1} max={18} style={{ width: 140, borderRadius: 8 }} />
                        </Form.Item>
                      )}

                      <Button
                        type="primary"
                        htmlType="submit"
                        size="large"
                        loading={submittingBooking}
                        icon={<CalendarOutlined />}
                        style={{
                          width: '100%',
                          height: 48,
                          borderRadius: 12,
                          background: '#16A34A',
                          borderColor: '#16A34A',
                          fontWeight: 700,
                          fontSize: 15,
                          marginTop: 8
                        }}
                      >
                        Confirm Reservation for {location.code}
                      </Button>
                    </Form>
                  </div>
                ) : (
                  <Card
                    style={{
                      borderRadius: 16,
                      border: '1px solid #BFDBFE',
                      background: 'linear-gradient(180deg, #F0F9FF 0%, #FFFFFF 100%)',
                      textAlign: 'center',
                      padding: '24px 16px'
                    }}
                  >
                    <div
                      style={{
                        width: 58,
                        height: 58,
                        borderRadius: '50%',
                        background: '#DBEAFE',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px',
                        color: '#1E3A8A',
                        fontSize: 26
                      }}
                    >
                      <CalendarOutlined />
                    </div>

                    <Title level={4} style={{ color: '#0F172A', marginBottom: 6 }}>
                      Sign In to Reserve {location.name}
                    </Title>
                    <Paragraph type="secondary" style={{ maxWidth: 460, margin: '0 auto 20px', fontSize: 13, lineHeight: 1.6 }}>
                      To reserve <strong>{location.name} ({location.code})</strong>, please sign in with your university account.
                      Once logged in, you will be redirected right back to this classroom to finalize your reservation.
                    </Paragraph>

                    <Space wrap size="middle" style={{ justifyContent: 'center', marginBottom: 16 }}>
                      <Button
                        type="primary"
                        size="large"
                        icon={<UserOutlined />}
                        onClick={() => navigate('/login/student', { state: { from: locationState } })}
                        style={{ background: '#1E3A8A', borderColor: '#1E3A8A', fontWeight: 700, borderRadius: 10 }}
                      >
                        Sign In as Student
                      </Button>
                      <Button
                        size="large"
                        icon={<IdcardOutlined />}
                        onClick={() => navigate('/login/lecturer', { state: { from: locationState } })}
                        style={{ fontWeight: 700, borderRadius: 10 }}
                      >
                        Sign In as Lecturer
                      </Button>
                      <Button
                        size="large"
                        onClick={() => navigate('/login/staff', { state: { from: locationState } })}
                        style={{ fontWeight: 600, borderRadius: 10 }}
                      >
                        Staff Portal
                      </Button>
                    </Space>

                    <div style={{ marginTop: 12 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        New to FSKTM?{' '}
                        <a
                          onClick={() => navigate('/register', { state: { from: locationState } })}
                          style={{ fontWeight: 700, color: '#2563EB', cursor: 'pointer' }}
                        >
                          Create student account &rarr;
                        </a>
                      </Text>
                    </div>

                    <Divider style={{ margin: '16px 0 12px 0' }} />

                    <div style={{ fontSize: 12, color: '#64748B' }}>
                      💡 <em>Tip: You do not need to sign in to report broken items or give feedback! Select the <strong>Report Breakdown</strong> or <strong>Classroom Feedback</strong> tabs above to submit freely.</em>
                    </div>
                  </Card>
                )}
              </div>
            )
          },
          {
            key: 'report',
            label: (
              <span style={{ fontWeight: 700, color: activeTab === 'report' ? '#DC2626' : undefined }}>
                <AlertOutlined style={{ color: '#DC2626' }} />
                <span>Report Breakdown</span>
                {summary.open_issues_count > 0 && (
                  <Badge count={summary.open_issues_count} style={{ backgroundColor: '#DC2626', marginLeft: 6 }} />
                )}
              </span>
            ),
            children: (
              <div style={{ paddingTop: 8 }}>
                {submittedIssueTicket ? (
                  <Result
                    status="success"
                    title="Defect Report Submitted!"
                    subTitle={
                      <div>
                        Ticket ID: <Text code strong>#{submittedIssueTicket.report_id}</Text>
                        <div style={{ marginTop: 6, fontSize: 13, color: '#64748B' }}>
                          Our faculty maintenance technicians have been notified and scheduled for inspection.
                        </div>
                      </div>
                    }
                    extra={[
                      <Button
                        key="another"
                        type="primary"
                        onClick={() => setSubmittedIssueTicket(null)}
                        style={{ fontWeight: 600 }}
                      >
                        Submit Another Report
                      </Button>,
                      <Button key="feedback" onClick={() => setActiveTab('feedback')}>
                        Give Classroom Feedback
                      </Button>
                    ]}
                  />
                ) : (
                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <Text strong style={{ fontSize: 14 }}>
                        What is broken or needs maintenance in {location.name}?
                      </Text>
                      <Paragraph type="secondary" style={{ fontSize: 12, margin: '2px 0 12px 0' }}>
                        Select the problem category below for faster technician response:
                      </Paragraph>

                      {/* Quick Category Chips */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                        {DEFECT_CATEGORIES.map(cat => {
                          const isSel = selectedCategory === cat.key;
                          return (
                            <button
                              type="button"
                              key={cat.key}
                              onClick={() => setSelectedCategory(cat.key)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 12px',
                                borderRadius: 10,
                                border: isSel ? `2px solid ${cat.color}` : '1px solid #E2E8F0',
                                background: isSel ? '#F8FAFC' : '#FFFFFF',
                                fontWeight: isSel ? 700 : 500,
                                color: isSel ? cat.color : '#334155',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                outline: 'none'
                              }}
                            >
                              <span>{cat.icon}</span>
                              <span style={{ fontSize: 12 }}>{cat.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <Form
                      form={issueForm}
                      layout="vertical"
                      onFinish={handleIssueSubmit}
                      requiredMark="optional"
                    >
                      <Form.Item
                        name="description"
                        label={<span style={{ fontWeight: 600 }}>Problem Details & Symptoms</span>}
                        rules={[{ required: true, message: 'Please describe what is faulty or broken' }]}
                      >
                        <Input.TextArea
                          rows={4}
                          placeholder={`e.g. ${
                            selectedCategory === 'Air Conditioning'
                              ? 'Air conditioner leaking water near door / room not cooling down'
                              : selectedCategory === 'Projector & AV'
                              ? 'Projector display is flickering or screen not lowering'
                              : 'Describe the issue observed in this room...'
                          }`}
                        />
                      </Form.Item>

                      <Form.Item label={<span style={{ fontWeight: 600 }}>Attach Photo Evidence (Optional)</span>}>
                        <Upload
                          listType="picture"
                          maxCount={1}
                          fileList={fileList}
                          onChange={({ fileList }) => setFileList(fileList)}
                          beforeUpload={() => false}
                        >
                          <Button icon={<CameraOutlined />}>Upload Photo Evidence</Button>
                        </Upload>
                      </Form.Item>

                      {/* Reporter details if not logged in */}
                      {!user && (
                        <Row gutter={12}>
                          <Col xs={24} sm={12}>
                            <Form.Item
                              name="reporter_name"
                              label="Your Name (Student / Staff)"
                              rules={[{ required: true, message: 'Please enter your name' }]}
                            >
                              <Input prefix={<UserOutlined style={{ color: '#94A3B8' }} />} placeholder="e.g. Aiman Hakim" />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12}>
                            <Form.Item
                              name="reporter_email"
                              label="Matric / Staff Email"
                              rules={[{ required: true, message: 'Please enter your email or matric ID' }]}
                            >
                              <Input prefix={<MailOutlined style={{ color: '#94A3B8' }} />} placeholder="e.g. WIF210045@siswa.um.edu.my" />
                            </Form.Item>
                          </Col>
                        </Row>
                      )}

                      <Button
                        type="primary"
                        danger
                        htmlType="submit"
                        size="large"
                        loading={submittingIssue}
                        icon={<AlertOutlined />}
                        style={{
                          width: '100%',
                          height: 48,
                          borderRadius: 12,
                          fontWeight: 700,
                          fontSize: 15,
                          marginTop: 8
                        }}
                      >
                        Submit Breakdown Report to Technicians
                      </Button>
                    </Form>
                  </div>
                )}
              </div>
            )
          },
          {
            key: 'feedback',
            label: (
              <span style={{ fontWeight: 700, color: activeTab === 'feedback' ? '#D97706' : undefined }}>
                <StarOutlined style={{ color: '#D97706' }} />
                <span>Classroom Feedback</span>
              </span>
            ),
            children: (
              <div style={{ paddingTop: 8 }}>
                {submittedFeedback ? (
                  <Result
                    status="success"
                    title="Feedback Received!"
                    subTitle="Thank you for reviewing this classroom. Your feedback directly helps FSKTM facility operations maintain high-standard learning spaces."
                    extra={[
                      <Button key="again" type="primary" onClick={() => setSubmittedFeedback(null)}>
                        Submit Another Feedback
                      </Button>,
                      <Button key="view" onClick={() => setActiveTab('activity')}>
                        View Room Reviews
                      </Button>
                    ]}
                  />
                ) : (
                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <Text strong style={{ fontSize: 14 }}>
                        Rate Your Experience in {location.name}
                      </Text>
                      <Paragraph type="secondary" style={{ fontSize: 12 }}>
                        Share ratings on room comfort, cleanliness, and audio-visual readiness.
                      </Paragraph>
                    </div>

                    <Form
                      form={feedbackForm}
                      layout="vertical"
                      onFinish={handleFeedbackSubmit}
                      initialValues={{
                        rating: 5,
                        cleanliness_rating: 5,
                        equipment_rating: 5,
                        ac_rating: 5,
                        category: 'General'
                      }}
                    >
                      {/* Rating Bars */}
                      <div
                        style={{
                          background: '#F8FAFC',
                          padding: '16px 18px',
                          borderRadius: 14,
                          border: '1px solid #E2E8F0',
                          marginBottom: 16
                        }}
                      >
                        <Form.Item
                          name="rating"
                          label={<span style={{ fontWeight: 700, fontSize: 13 }}>Overall Classroom Experience</span>}
                          rules={[{ required: true }]}
                        >
                          <Rate style={{ fontSize: 28, color: '#F59E0B' }} />
                        </Form.Item>

                        <Divider style={{ margin: '12px 0' }} />

                        <Row gutter={[16, 12]}>
                          <Col xs={24} sm={8}>
                            <Form.Item name="ac_rating" label="❄️ AC / Temperature">
                              <Rate style={{ fontSize: 18, color: '#0284C7' }} />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={8}>
                            <Form.Item name="cleanliness_rating" label="🧹 Cleanliness">
                              <Rate style={{ fontSize: 18, color: '#059669' }} />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={8}>
                            <Form.Item name="equipment_rating" label="📽️ AV & Sockets">
                              <Rate style={{ fontSize: 18, color: '#7C3AED' }} />
                            </Form.Item>
                          </Col>
                        </Row>
                      </div>

                      <Form.Item
                        name="comments"
                        label={<span style={{ fontWeight: 600 }}>Your Comments & Suggestions</span>}
                        rules={[{ required: true, message: 'Please share your feedback or suggestions' }]}
                      >
                        <Input.TextArea
                          rows={4}
                          placeholder="e.g. Excellent projector quality today, but chairs at row 3 need arrangement. AC temperature was comfortable."
                        />
                      </Form.Item>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 16,
                          background: '#F1F5F9',
                          padding: '10px 14px',
                          borderRadius: 10
                        }}
                      >
                        <div>
                          <Text strong style={{ fontSize: 13 }}>Submit Anonymously</Text>
                          <div style={{ fontSize: 11, color: '#64748B' }}>Hide your name and email on public reviews</div>
                        </div>
                        <Switch checked={isAnonymous} onChange={setIsAnonymous} />
                      </div>

                      {!isAnonymous && !user && (
                        <Row gutter={12}>
                          <Col xs={24} sm={12}>
                            <Form.Item name="reporter_name" label="Your Name (Optional)">
                              <Input prefix={<UserOutlined />} placeholder="Student / Lecturer Name" />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12}>
                            <Form.Item name="reporter_email" label="Your Email (Optional)">
                              <Input prefix={<MailOutlined />} placeholder="name@siswa.um.edu.my" />
                            </Form.Item>
                          </Col>
                        </Row>
                      )}

                      <Button
                        type="primary"
                        htmlType="submit"
                        size="large"
                        loading={submittingFeedback}
                        icon={<SmileOutlined />}
                        style={{
                          width: '100%',
                          height: 48,
                          borderRadius: 12,
                          background: '#1E3A8A',
                          borderColor: '#1E3A8A',
                          fontWeight: 700,
                          fontSize: 15
                        }}
                      >
                        Submit Classroom Feedback
                      </Button>
                    </Form>
                  </div>
                )}
              </div>
            )
          },
          {
            key: 'schedule',
            label: (
              <span style={{ fontWeight: 700 }}>
                <CalendarOutlined style={{ color: '#2563EB' }} />
                <span>Today's Schedule</span>
              </span>
            ),
            children: (
              <div style={{ paddingTop: 8 }}>
                <Title level={4} style={{ fontSize: 15, marginBottom: 12 }}>
                  Scheduled Sessions for Today ({new Date().toLocaleDateString('en-GB')})
                </Title>
                {todays_bookings.length === 0 ? (
                  <div
                    style={{
                      background: '#F0FDF4',
                      border: '1px solid #BBF7D0',
                      borderRadius: 12,
                      padding: 20,
                      textAlign: 'center'
                    }}
                  >
                    <CheckCircleOutlined style={{ color: '#16A34A', fontSize: 24, marginBottom: 8 }} />
                    <div style={{ fontWeight: 700, color: '#15803D' }}>Room Available Today</div>
                    <div style={{ fontSize: 12, color: '#166534', marginTop: 4 }}>
                      No more reserved sessions scheduled for this room today.
                    </div>
                  </div>
                ) : (
                  <Timeline
                    style={{ marginTop: 16 }}
                    items={todays_bookings.map(b => ({
                      color: 'blue',
                      children: (
                        <div style={{ marginBottom: 10 }}>
                          <Space size={6} wrap>
                            <Tag color="geekblue" style={{ fontWeight: 700 }}>
                              {new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &rarr; {new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Tag>
                            {b.course_id && <Tag color="cyan">{b.course_id}</Tag>}
                          </Space>
                          <div style={{ fontWeight: 600, fontSize: 13, marginTop: 4 }}>{b.purpose}</div>
                          <div style={{ fontSize: 11, color: '#64748B' }}>Booked by {b.booked_by}</div>
                        </div>
                      )
                    }))}
                  />
                )}
              </div>
            )
          },
          {
            key: 'activity',
            label: (
              <span style={{ fontWeight: 700 }}>
                <ToolOutlined />
                <span>Room Reviews ({feedbacks.length})</span>
              </span>
            ),
            children: (
              <div style={{ paddingTop: 8 }}>
                {/* Rating breakdown summary */}
                <div
                  style={{
                    background: '#F8FAFC',
                    padding: 16,
                    borderRadius: 12,
                    border: '1px solid #E2E8F0',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-around',
                    flexWrap: 'wrap',
                    gap: 12
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: '#F59E0B' }}>
                      {summary.average_rating > 0 ? summary.average_rating.toFixed(1) : '5.0'}
                    </div>
                    <Rate disabled allowHalf value={summary.average_rating || 5} style={{ fontSize: 12 }} />
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>Overall Score</div>
                  </div>

                  <div style={{ fontSize: 12, color: '#475569' }}>
                    <div>❄️ AC Comfort: <strong>{summary.average_ac || 5.0} / 5</strong></div>
                    <div>🧹 Cleanliness: <strong>{summary.average_cleanliness || 5.0} / 5</strong></div>
                    <div>📽️ AV / Tech: <strong>{summary.average_equipment || 5.0} / 5</strong></div>
                  </div>
                </div>

                {/* List of recent feedback */}
                {feedbacks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: '#94A3B8' }}>
                    No feedback reviews submitted yet for this room. Be the first to review!
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {feedbacks.map(f => (
                      <div
                        key={f.feedback_id}
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: 10,
                          padding: '12px 14px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: 13 }}>
                            {f.reporter_name || 'Student'}
                          </span>
                          <span style={{ fontSize: 11, color: '#94A3B8' }}>
                            {formatDateTime(f.created_at)}
                          </span>
                        </div>
                        <Rate disabled value={f.rating || 5} style={{ fontSize: 12, margin: '4px 0' }} />
                        <div style={{ fontSize: 12, color: '#334155' }}>{f.comments}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          }
        ]}
      />

      {/* Bottom Sticky Link to FSKTM Main App */}
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Link to="/map">
          <Button icon={<CompassOutlined />} style={{ borderRadius: 8, fontWeight: 600 }}>
            Open Faculty Floor Map
          </Button>
        </Link>
      </div>
    </div>
  );
}
