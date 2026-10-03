import { consultationRepository, ConsultationQueryFilters } from '@/repositories/consultationRepository';
import { z } from 'zod';
import { createConsultationSchema, updateConsultationSchema } from '@/validators/consultationValidator';

export const consultationService = {
  async getConsultations(filters: ConsultationQueryFilters) {
    return await consultationRepository.findMany(filters);
  },

  async getConsultationById(id: string) {
    return await consultationRepository.findById(id);
  },

  async createConsultation(data: z.infer<typeof createConsultationSchema>) {
    return await consultationRepository.create(data);
  },

  async updateConsultation(id: string, data: z.infer<typeof updateConsultationSchema>) {
    return await consultationRepository.update(id, data);
  },
};
