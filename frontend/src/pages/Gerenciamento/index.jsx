import MedicineTable from "../../components/Gerenciamento/MedicineTable"
import Header from "../../components/Header"
import Sidebar from "../../components/Sidebar"
import styles from "../../styles/Gerenciamento.module.css"

export default function Gerenciamento(){
    return(
        <>
            <Header/>
            <div style={{
                display: 'flex',
            }}>
                <Sidebar/>
                <MedicineTable/>
            </div>
        </>
    )
}