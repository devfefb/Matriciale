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

  async getUnits(req: Request, res: Response) {
    console.log('[DEBUG] MedicinesController.getUnits called');
    try {
      const { email } = req.query;
      console.log(`[DEBUG] Query params: email=${email}`);
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const units = await this.medicineService.getUnits(String(email));
      console.log(`[DEBUG] Units returned: ${JSON.stringify(units)}`);
      return res.json(units);
    } catch (error: any) {
      console.error(`[DEBUG] Error in getUnits: ${error.message}`);
      return res.status(400).json({ error: error.message });
    }
  }

  async getReport(req: Request, res: Response) {
    try {
      const { email, unit } = req.query;
      if (!email || !unit) {
        return res.status(400).json({ error: 'Email and unit are required' });
      }

      const report = await this.medicineService.getMedicinesForReport(String(email), String(unit));
      return res.json(report);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
}
