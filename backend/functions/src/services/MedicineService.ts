import { MedicineRepository } from '../repositories/MedicineRepository';

export class MedicineService {
  private medicineRepository: MedicineRepository;

  constructor() {
    this.medicineRepository = new MedicineRepository();
  }

  getMunicipio(email: string | undefined): string | null {
    if (!email) return null;
    const normalizedEmail = email.toLowerCase();

    const PALMARES = ['gustavo.moraes@beetsjr.com.br'];
    const PIRANGI = ['andre.ricardo.goncales@gmail.com'];

    if (PALMARES.includes(normalizedEmail)) return 'Palmares';
    if (PIRANGI.includes(normalizedEmail)) return 'Pirangi';

    return null;
  }

  async getGeneralTable(email: string) {
    const municipio = this.getMunicipio(email);
    if (!municipio) throw new Error('Município não encontrado para este usuário.');

    const medicines = await this.medicineRepository.getMedicinesByUnit(municipio, 'CAF');

    return medicines.map((med: any) => ({
      id: med.id,
      cod_item: med.cod_item,
      nome: med.nome,
      classificacao: med.classificacao,
      tp_metodo: med.tp_metodo,
      tp_unidade_medicamento: med.tp_unidade_medicamento,
      estoque: med.estoque,
      status: med.tp_metodo ? (med.estoque / med.tp_metodo) : 0
    }));
  }

  async getMedicineDetails(email: string, medicineId: string) {
    const municipio = this.getMunicipio(email);
    if (!municipio) throw new Error('Município não encontrado para este usuário.');

    const units = await this.medicineRepository.getAllUnits(municipio);

    const details = [];

    // Ensure CAF is first if it exists in units, or fetch it specifically if not in the list (though it should be)
    // The requirement says: "Primeira Linha: Valores correspondentes à CAF."

    // Let's fetch CAF specifically first to ensure order
    const cafData = await this.medicineRepository.getMedicineInUnit(municipio, 'CAF', medicineId);
    if (cafData) {
      details.push({
        unidade: 'CAF',
        nome: cafData.nome,
        estoque: cafData.estoque,
        met_est: cafData.met_est,
        reposicao: cafData.reposicao
      });
    }

    // Now other units
    for (const unit of units) {
      if (unit.id === 'CAF') continue; // Skip CAF as we already added it
      const unitMed = await this.medicineRepository.getMedicineInUnit(municipio, unit.id, medicineId);
      if (unitMed) {
        details.push({
          unidade: unit.id,
          nome: unitMed.nome,
          estoque: unitMed.estoque,
          met_est: unitMed.met_est,
          reposicao: unitMed.reposicao
        });
      }
    }

    return details;
  }
}
