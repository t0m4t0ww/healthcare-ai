import api from './services';

const unwrapData = (response) => {
  const envelope = response?.data ?? response;
  return envelope?.data ?? envelope;
};

export const fetchPatientRecords = async (params = {}) => {
  const response = await api.get('/ehr/admin/patient-records', { params });
  const data = unwrapData(response) || {};
  const records = Array.isArray(data.data) ? data.data : (data.records || data) || [];

  return {
    records,
    stats: data.stats || {},
    pagination: {
      total: data.total ?? records.length,
      page: data.page ?? params.page ?? 1,
      limit: data.limit ?? params.limit ?? records.length,
    },
  };
};

export const createRecord = async (payload) => {
  const response = await api.post('/ehr/records', payload);
  return unwrapData(response);
};

export const updateRecord = async (recordId, payload) => {
  const response = await api.put(`/ehr/records/${recordId}`, payload);
  return unwrapData(response);
};

export const deleteRecord = async (recordId) => {
  const response = await api.delete(`/ehr/records/${recordId}`);
  return unwrapData(response);
};

export const downloadRecordPdf = async (recordId) => {
  const response = await api.get(`/ehr/records/${recordId}/pdf`, {
    responseType: 'blob',
  });

  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;

  const disposition = response.headers?.['content-disposition'];
  const filenameMatch = disposition && disposition.match(/filename="?([^"]+)"?/);
  link.download = filenameMatch ? filenameMatch[1] : `record-${recordId}.pdf`;

  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);

  return true;
};

export default {
  fetchPatientRecords,
  createRecord,
  updateRecord,
  deleteRecord,
  downloadRecordPdf,
};

