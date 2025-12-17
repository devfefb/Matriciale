import React from 'react'
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import styles from '../styles/Header.module.css'
import logo from '../img/Logo2.png'
import saida from '../img/sair1.png'
import perfil from '../img/user1.png'
import { Button } from '@mui/material'


function Header(){
    const { user, signOut, isAdmin } = useAuth();
    const navigate = useNavigate();
    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };
    return(
        <div className={styles.header}>
            <div className={styles.header_logo}><img src={logo}/></div>
            <div className={styles.header_perfil}>
                <div>
                  <span>{user?.name}</span>
                  {isAdmin && <span className={styles.adminLabel}>ADMIN</span>}
                  {/* <p>Editar Perfil</p> */}
                </div>
                <img className={styles.foto_perfil} src={perfil}/>
                <div className={styles.saida}><Button onClick={handleLogout}><img src={saida} /></Button></div>
            </div>
        </div>
    )

}

export default Header;