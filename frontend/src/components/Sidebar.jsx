import { Link } from 'react-router-dom'
import styles from '../styles/Sidebar.module.css'
import casa from '../img/casa.png'
import remedio from '../img/remedio.png'
import relatorio from '../img/relatorio.png'
import calendario from '../img/calendario.png'
import medico from '../img/medico.png'
import engrenagem from '../img/engrenagem.png'
import farmacia from '../img/farmacia.png'
import sair from '../img/sair.png'

function Sidebar(){

    return(
        <nav className={styles.sidebar}>
            <Link to="/"><div><img src={casa}/></div><p>Página Inicial</p></Link>
            <Link to="/gerenciamento"><div><img src={remedio}/></div><p>Visualizar<br/>Medicamento</p></Link>
            <Link><div><img src={farmacia}/></div><p>Visualizar<br/>Farmácias</p></Link>
            <Link to="/relatorio"><div><img src={relatorio}/></div><p>Relatórios</p></Link>
            {/* <Link to="/documentos"><div><img src={relatorio}/></div><p>Documentos</p></Link> */}
            <Link to="/calendar"><div><img src={calendario}/></div><p>Agenda</p></Link>
            <Link to="/users/pacientes"><div><img src={medico}/></div><p>Pacientes</p></Link>
            <Link to="/conversor"><div><img src={relatorio}/></div><p>Conversor</p></Link>
        </nav>
    )

}

export default Sidebar;