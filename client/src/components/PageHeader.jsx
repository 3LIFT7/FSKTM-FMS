import React from 'react';
import { Typography, Space } from 'antd';

const { Title, Paragraph } = Typography;

export default function PageHeader({ title, subtitle, extra, icon, tag }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-900 text-xl flex items-center justify-center shrink-0">
            {icon}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Title level={3} style={{ margin: 0, fontWeight: 800, fontSize: 'clamp(18px, 4vw, 24px)', lineHeight: 1.25 }}>
              {title}
            </Title>
            {tag}
          </div>
          {subtitle && (
            <Paragraph type="secondary" style={{ margin: '4px 0 0 0', fontSize: 'clamp(12px, 2.5vw, 13px)', lineHeight: 1.35 }}>
              {subtitle}
            </Paragraph>
          )}
        </div>
      </div>
      {extra && <Space wrap>{extra}</Space>}
    </div>
  );
}
