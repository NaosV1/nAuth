import { useState, useRef, useEffect } from 'react'
import jsQR from 'jsqr'
import './QRScanner.css'

interface QRScannerProps {
  onScan: (data: string) => void
}

function QRScanner({ onScan }: QRScannerProps) {
  const [uri, setUri] = useState('')
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [pasteReady, setPasteReady] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pasteAreaRef = useRef<HTMLDivElement>(null)

  const decodeQRFromImage = async (imageData: ImageData): Promise<string | null> => {
    const code = jsQR(imageData.data, imageData.width, imageData.height)
    return code?.data || null
  }

  const processImageFile = async (file: File): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const img = new Image()
          img.onload = async () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')

            if (!ctx) {
              reject(new Error('Failed to get canvas context'))
              return
            }

            ctx.drawImage(img, 0, 0)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const qrData = await decodeQRFromImage(imageData)

            if (qrData) {
              resolve(qrData)
            } else {
              reject(new Error('No QR code found in image'))
            }
          }
          img.onerror = () => reject(new Error('Failed to load image'))
          img.src = e.target?.result as string
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }

  const handleUriSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!uri.trim()) {
      setError('Please enter an OTP URI')
      return
    }

    if (!uri.startsWith('otpauth://')) {
      setError('URI must start with otpauth://')
      return
    }

    onScan(uri.trim())
  }

  useEffect(() => {
    // Add global paste listener
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          if (!file) continue

          setError('')
          setScanning(true)
          setPasteReady(false)

          try {
            const qrData = await processImageFile(file)
            onScan(qrData)
          } catch (err) {
            console.error('QR decode error:', err)
            setError('No QR code found in the pasted image. Please try again.')
          } finally {
            setScanning(false)
          }
          return
        }
      }
    }

    document.addEventListener('paste', handleGlobalPaste)

    // Set paste ready indicator
    setPasteReady(true)

    return () => {
      document.removeEventListener('paste', handleGlobalPaste)
    }
  }, [onScan])

  const handlePaste = async (e: React.ClipboardEvent) => {
    e.preventDefault()
    setError('')
    setPasteReady(false)

    const items = e.clipboardData?.items
    if (!items) return

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (!file) continue

        setScanning(true)

        try {
          const qrData = await processImageFile(file)
          onScan(qrData)
        } catch (err) {
          console.error('QR decode error:', err)
          setError('No QR code found in the pasted image. Please try again.')
        } finally {
          setScanning(false)
        }
        return
      }
    }

    setError('No image found in clipboard. Please copy an image first.')
  }

  const handleCameraClick = async () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    setScanning(true)

    try {
      const qrData = await processImageFile(file)
      onScan(qrData)
    } catch (err) {
      console.error('QR decode error:', err)
      setError('No QR code found in the image. Please try another image.')
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="qr-scanner">
      {scanning && (
        <div className="scanning-overlay">
          <p>Decoding QR code...</p>
        </div>
      )}

      {pasteReady && !scanning && (
        <div className="paste-banner">
          <span className="paste-icon">📋</span>
          <span>Paste ready! Press <kbd>Ctrl+V</kbd> or <kbd>⌘+V</kbd> anywhere</span>
        </div>
      )}

      <div
        ref={pasteAreaRef}
        className={`scanner-box ${pasteReady ? 'paste-ready' : ''}`}
        tabIndex={0}
        onFocus={() => setPasteReady(true)}
        onBlur={() => setPasteReady(false)}
      >
        <div className="scanner-icon">📷</div>
        <h3 className="paste-title">Add QR Code</h3>
        <p className="text-secondary">
          Copy a QR code image and press <kbd>Ctrl+V</kbd> (or <kbd>⌘+V</kbd>)
        </p>

        <div className="divider-small">
          <span>OR</span>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleCameraClick}
          disabled={scanning}
        >
          📁 Upload Image File
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>

      <div className="divider">
        <span>OR</span>
      </div>

      <form onSubmit={handleUriSubmit} className="uri-form">
        <div className="form-group">
          <label htmlFor="uri">Paste OTP URI</label>
          <input
            id="uri"
            type="text"
            className="input"
            placeholder="otpauth://totp/..."
            value={uri}
            onChange={e => setUri(e.target.value)}
          />
        </div>

        {error && <div className="error-message-small">{error}</div>}

        <button type="submit" className="btn btn-secondary">
          Add from URI
        </button>
      </form>
    </div>
  )
}

export default QRScanner
