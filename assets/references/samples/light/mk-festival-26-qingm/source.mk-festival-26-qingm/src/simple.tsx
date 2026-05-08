import React, { useEffect } from 'react'
import { init } from './base'
//@ts-ignore
import themeColor from 'variables!./simple'
const Simple: React.FC = () => {
  useEffect(() => {
    init(themeColor)
  }, [])
  return null
}
export default Simple
