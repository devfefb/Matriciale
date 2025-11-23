import { Request, Response } from 'express';
import { CalculosService } from '../services/CalculosService';

export class CalculosController {
  private calculosService: CalculosService;

  constructor() {
    this.calculosService = new CalculosService();
  }

  async executar(req: Request, res: Response) {
    try {
      const { municipio } = req.body;

      if (!municipio) {
        return res.status(400).json({ error: 'Município é obrigatório.' });
      }

      const resultado = await this.calculosService.executarCalculos(municipio);
      return res.json(resultado);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
