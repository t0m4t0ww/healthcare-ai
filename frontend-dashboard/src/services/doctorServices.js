// Doctor Services - Wrapper for doctor-related API calls
import { getDoctors, createDoctor, updateDoctor, deleteDoctor } from './services';

const doctorServices = {
  getDoctors: async (params) => {
    return await getDoctors(params);
  },

  createDoctor: async (payload) => {
    return await createDoctor(payload);
  },

  updateDoctor: async (id, patch) => {
    return await updateDoctor(id, patch);
  },

  deleteDoctor: async (id) => {
    return await deleteDoctor(id);
  }
};

export default doctorServices;
