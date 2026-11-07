import { AnimatePresence,motion } from 'motion/react';
import { CheckCircle2,Info,AlertCircle,X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
export default function ToastHost(){const {toast}=useStore();if(!toast)return null;const Icon=toast.tone==='error'?AlertCircle:toast.tone==='info'?Info:CheckCircle2;return <AnimatePresence><motion.div className={`toast-card toast-${toast.tone||'success'}`} initial={{opacity:0,y:20,scale:.96}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:12}}><Icon size={20}/><div><strong>{toast.title}</strong>{toast.message&&<p>{toast.message}</p>}</div></motion.div></AnimatePresence>;}
