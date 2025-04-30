import Header from "../../components/Header"
import Sidebar from "../../components/Sidebar"
import RelatorioTable from "../../components/Relatorio/RelatorioTable"

export default function Relatorio(){
    return(
        <>
            <Header/>
            <div style={{
                display: 'flex'
            }}>
                <Sidebar/>
                <RelatorioTable/>
            </div>
        </>
    )
}