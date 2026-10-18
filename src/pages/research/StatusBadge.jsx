import { RESEARCH_STATUS_LABEL } from '@/constants/researchConst'
import styles from './Research.module.css'

export default function StatusBadge({
  status, // string: RESEARCH_STATUS 값
}) {
  return <span className={`${styles.status} ${styles[status]}`}>{RESEARCH_STATUS_LABEL[status]}</span>
}
