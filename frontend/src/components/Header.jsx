import React from 'react'
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import styles from '../styles/Header.module.css'
import logo from '../img/Logo.png'
import saida from '../img/sair.png'
import perfil from '../img/user.png'
import { Button } from '@mui/material'


function Header(){
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };
    return(
        <div className={styles.header}>
            <div className={styles.header_logo}><img src={logo}/></div>
            <div className={styles.header_perfil}>
                <div><span>{user?.name}</span><p>Editar Perfil</p></div>
                <img className={styles.foto_perfil} src={perfil}/>
                <div className={styles.saida}><Button onClick={handleLogout}><img src={saida} /></Button></div>
            </div>
        </div>
    )

}

export default Header;