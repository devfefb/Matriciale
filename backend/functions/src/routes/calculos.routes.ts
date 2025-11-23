import { Router } from 'express';
import { CalculosController } from '../controllers/CalculosController';

const calculosRoutes = Router();
const calculosController = new CalculosController();

calculosRoutes.post('/executar', (req, res) => calculosController.executar(req, res));

export { calculosRoutes };
