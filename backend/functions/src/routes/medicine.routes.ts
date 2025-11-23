import { Router } from 'express';
import { MedicinesController } from '../controllers/MedicinesController';

const medicineRoutes = Router();
const medicinesController = new MedicinesController();

medicineRoutes.get('/general', (req, res) => medicinesController.getGeneral(req, res));
medicineRoutes.get('/details/:id', (req, res) => medicinesController.getDetails(req, res));

export { medicineRoutes };
