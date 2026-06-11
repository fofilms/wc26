import { useEffect, useState } from 'react'
import s from './Toast.module.css'

export default function Toast({ message, onDone }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!message) return
    setVisible(true)
    const t = setTimeout(() => { setVisible(false); setTimeout(onDone, 300) }, 1600)
    return () => clearTimeout(t)
  }, [message, onDone])

  if (!message) return null
  return <div className={`${s.toast} ${visible ? s.show : ''}`}>{message}</div>
}
