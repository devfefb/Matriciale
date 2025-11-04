import { Router } from 'express';
import { TaskController } from '../controllers/TaskController';
import { authMiddleware } from '../middlewares/auth';

const taskRoutes = Router();
const taskController = new TaskController();

taskRoutes.use(authMiddleware);

taskRoutes.post('/', taskController.create);
taskRoutes.get('/:municipio', taskController.listByMunicipio);

export { taskRoutes };