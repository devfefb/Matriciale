export interface Task {
  id?: string;
  label: string;
  color: string;
  bgColor: string;
  date: string;
  municipio: string;
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreateTaskDTO {
  label: string;
  color: string;
  bgColor: string;
  date: string;
  municipio: string;
}