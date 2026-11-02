import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { api } from '../services/api';
import { useStore } from './StoreContext';

type AuthValue = { loading:boolean; login:(email:string,password:string)=>Promise<void>; register:(name:string,email:string,password:string)=>Promise<void>; logout:()=>Promise<void>; demoRole:'admin'|'customer'|null; enterDemo:(role:'admin'|'customer')=>void; exitDemo:()=>void };
const AuthContext=createContext<AuthValue|null>(null);
export function AuthProvider({children}:{children:ReactNode}){
 const [loading,setLoading]=useState(false); const [demoRole,setDemoRole]=useState<'admin'|'customer'|null>(()=>sessionStorage.getItem('at_demo_role') as 'admin'|'customer'|null); const {setUser,notify}=useStore();
 const login=async(email:string,password:string)=>{setLoading(true);try{const data=await api<{user:{name:string;email:string};token:string}>('/auth/login',{method:'POST',body:JSON.stringify({email,password})});sessionStorage.setItem('at_session',data.token);sessionStorage.removeItem('at_demo_role');setDemoRole(null);setUser(data.user);notify('Welcome back',`Good to see you, ${data.user.name}.`);}finally{setLoading(false);}};
 const register=async(name:string,email:string,password:string)=>{setLoading(true);try{const data=await api<{user:{name:string;email:string};token:string}>('/auth/register',{method:'POST',body:JSON.stringify({name,email,password})});sessionStorage.setItem('at_session',data.token);setUser(data.user);notify('Account created','Your AmaanTraders account is ready.');}finally{setLoading(false);}};
 const logout=async()=>{try{await api('/auth/logout',{method:'POST',body:JSON.stringify({})});}catch{}sessionStorage.removeItem('at_session');sessionStorage.removeItem('at_demo_role');setDemoRole(null);setUser(null);notify('Signed out','See you again soon.','info');};
 const enterDemo=(role:'admin'|'customer')=>{sessionStorage.setItem('at_demo_role',role);setDemoRole(role);setUser(role==='admin'?{name:'Store Administrator',email:'admin@amaantraders.demo'}:{name:'Amaan Guest',email:'customer@amaantraders.demo'});};
 const exitDemo=()=>{sessionStorage.removeItem('at_demo_role');setDemoRole(null);setUser(null);};
 const value=useMemo(()=>({loading,login,register,logout,demoRole,enterDemo,exitDemo}),[loading,demoRole]);
 return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(){const v=useContext(AuthContext);if(!v)throw new Error('useAuth must be inside AuthProvider');return v;}
