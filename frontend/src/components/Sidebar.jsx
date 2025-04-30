import { Link } from 'react-router-dom'
import styles from '../styles/Sidebar.module.css'
import casa from '../img/casa.png'
import remedio from '../img/remedio.png'
import relatorio from '../img/relatorio.png'
import calendario from '../img/calendario.png'
import medico from '../img/medico.png'
import engrenagem from '../img/engrenagem.png'
import farmacia from '../img/farmacia.png'

function Sidebar(){

    return(
        <nav className={styles.sidebar}>
            <Link to="/"><div><img src={casa}/></div><p>Página Inicial</p></Link>
            <Link to="/gerenciamento"><div><img src={remedio}/></div><p>Visualizar<br/>Medicamento</p></Link>
            <Link><div><img src={farmacia}/></div><p>Visualizar<br/>Farmácias</p></Link>
            <Link to="/relatorio"><div><img src={relatorio}/></div><p>Relatórios</p></Link>
            <Link><div><img src={calendario}/></div><p>Agenda</p></Link>
            <Link><div><img src={medico}/></div><p>Pacientes</p></Link>
            <div  className={styles.configuracao}><Link><div><img src={engrenagem}/></div><p>Configurações</p></Link></div>

        </nav>
    )

}

export default Sidebar;