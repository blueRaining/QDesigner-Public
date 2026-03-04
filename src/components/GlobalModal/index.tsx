import React from 'react';
import { Modal } from 'antd';
interface GlobalModalProps {
  visible: boolean;
  title?: string;
  content: string;
  onOk: () => void;
  onCancel: () => void;
  okText?: string;
  cancelText?: string;
}

const GlobalModal: React.FC<GlobalModalProps> = ({
  visible,
  title,
  content,
  onOk,
  onCancel,
  okText,
  cancelText
}) => {
  const resolvedTitle = title ?? '确认';
  const resolvedOkText = okText ?? '确定';
  const resolvedCancelText = cancelText ?? '取消';
  return (
    <Modal
      title={resolvedTitle}
      open={visible}
      onOk={onOk}
      onCancel={onCancel}
      okText={resolvedOkText}
      cancelText={resolvedCancelText}
      centered
      maskClosable={false}

    >
      <p>{content}</p>
    </Modal>
  );
};

export default GlobalModal; 