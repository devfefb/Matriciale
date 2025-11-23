import { Request, Response } from 'express';
import { MedicineService } from '../services/MedicineService';

export class MedicinesController {
  private medicineService: MedicineService;

  constructor() {
    this.medicineService = new MedicineService();
  }

  async getGeneral(req: Request, res: Response) {
    try {
      const { email } = req.query;
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const medicines = await this.medicineService.getGeneralTable(String(email));
      return res.json(medicines);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async getDetails(req: Request, res: Response) {
    try {
      const { email } = req.query;
      const { id } = req.params;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const details = await this.medicineService.getMedicineDetails(String(email), id);
      return res.json(details);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
}
