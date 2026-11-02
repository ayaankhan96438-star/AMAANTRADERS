import { Link } from 'react-router-dom';
export default function Brand({light=false}:{light?:boolean}){
 return <Link to="/" className={`brand-mark ${light?'brand-light':''}`} aria-label="AmaanTraders home"><span className="brand-symbol">A<span>.</span></span><span className="brand-word">AMAANTRADERS<small>THE OUTERWEAR HOUSE</small></span></Link>;
}
