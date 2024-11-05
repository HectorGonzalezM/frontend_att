'use client'

import { useState, useRef, useEffect } from 'react'
import Webcam from 'react-webcam'
import axios from 'axios'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Camera, UserPlus, Clock, FileText, Users, Trash2 } from 'lucide-react'
import Image from 'next/image'

export default function AttendanceApp() {
  // State variables
  const [registerImage, setRegisterImage] = useState<File | null>(null)
  const [registerImagePreview, setRegisterImagePreview] = useState<string | null>(null)
  const [attendanceImage, setAttendanceImage] = useState<File | null>(null)
  const [attendanceImagePreview, setAttendanceImagePreview] = useState<string | null>(null)
  const [userId, setUserId] = useState<string>('')
  const [selectedDates, setSelectedDates] = useState<{ from: Date | undefined; to: Date | undefined } | undefined>()
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false)
  const [dialogContent, setDialogContent] = useState<string>('')
  const [users, setUsers] = useState<any[]>([])
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false)
  const webcamRef = useRef<Webcam>(null)
  const [cameraType, setCameraType] = useState<'register' | 'attendance'>('register')
  const [isWebcamAvailable, setIsWebcamAvailable] = useState<boolean>(false)

  const backendUrl = 'https://web-production-2da4.up.railway.app'

  const registerInputRef = useRef<HTMLInputElement>(null)
  const attendanceInputRef = useRef<HTMLInputElement>(null)

  // Check for webcam support
  useEffect(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function') {
      setIsWebcamAvailable(true)
    } else {
      setIsWebcamAvailable(false)
    }
  }, [])

  // Functions
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'register' | 'attendance') => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (type === 'register') {
          setRegisterImage(file)
          setRegisterImagePreview(reader.result as string)
        } else {
          setAttendanceImage(file)
          setAttendanceImagePreview(reader.result as string)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const capturePhoto = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot()
      if (imageSrc) {
        const byteString = atob(imageSrc.split(',')[1])
        const ab = new ArrayBuffer(byteString.length)
        const ia = new Uint8Array(ab)
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i)
        }
        const blob = new Blob([ab], { type: 'image/jpeg' })
        const file = new File([blob], 'captured_photo.jpg', { type: 'image/jpeg' })

        const reader = new FileReader()
        reader.onloadend = () => {
          if (cameraType === 'register') {
            setRegisterImage(file)
            setRegisterImagePreview(reader.result as string)
          } else {
            setAttendanceImage(file)
            setAttendanceImagePreview(reader.result as string)
          }
        }
        reader.readAsDataURL(file)
        setIsCameraOpen(false)
      }
    }
  }

  const handleRegister = async () => {
    if (!userId || !registerImage) {
      alert('Please enter User ID and select an image.')
      return
    }

    const formData = new FormData()
    formData.append('user_id', userId)
    formData.append('images', registerImage)

    try {
      const response = await axios.post(`${backendUrl}/register`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      setDialogContent(response.data.message)
      setIsDialogOpen(true)
    } catch (error: any) {
      setDialogContent(error.response?.data?.error || 'An error occurred.')
      setIsDialogOpen(true)
    }
  }

  const handleLogAttendance = async () => {
    if (!attendanceImage) {
      alert('Please select an image.')
      return
    }

    const formData = new FormData()
    formData.append('image', attendanceImage)

    try {
      const response = await axios.post(`${backendUrl}/predict`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      const predictedUserId = response.data.user_id

      // Log attendance
      await axios.post(`${backendUrl}/attendance`, { user_id: predictedUserId })

      setDialogContent(`Attendance logged for user: ${predictedUserId}`)
      setIsDialogOpen(true)
    } catch (error: any) {
      setDialogContent(error.response?.data?.message || 'An error occurred.')
      setIsDialogOpen(true)
    }
  }

  const handleGenerateReport = async () => {
    if (!selectedDates?.from || !selectedDates?.to) {
      alert('Please select a date range.')
      return
    }

    const startDate = selectedDates.from.toISOString().split('T')[0]
    const endDate = selectedDates.to.toISOString().split('T')[0]

    try {
      const response = await axios.get(`${backendUrl}/attendance_report`, {
        params: { start_date: startDate, end_date: endDate },
        responseType: 'blob',
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `attendance_report_${startDate}_to_${endDate}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error: any) {
      setDialogContent(error.response?.data?.error || 'An error occurred.')
      setIsDialogOpen(true)
    }
  }

  const handleListUsers = async () => {
    try {
      const response = await axios.get(`${backendUrl}/list_users`)
      const userIds = response.data.users.map((user: any) => user.user_id)
      setDialogContent('Registered Users:\n' + userIds.join('\n'))
      setIsDialogOpen(true)
    } catch (error: any) {
      setDialogContent(error.response?.data?.error || 'An error occurred.')
      setIsDialogOpen(true)
    }
  }

  const handleDeleteUser = async () => {
    const deleteUserId = prompt('Enter the User ID to delete:')
    if (!deleteUserId) return

    try {
      await axios.delete(`${backendUrl}/delete_user`, {
        data: { user_id: deleteUserId },
      })
      setDialogContent(`User ${deleteUserId} deleted successfully.`)
      setIsDialogOpen(true)
    } catch (error: any) {
      setDialogContent(error.response?.data?.error || 'An error occurred.')
      setIsDialogOpen(true)
    }
  }

  // Modify the onSelect handler without explicitly typing `range`
  const handleDateSelect = (range: any) => {
    setSelectedDates(range ? { from: range.from, to: range.to } : undefined)
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl h-[calc(100vh-2rem)] overflow-auto bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-3xl shadow-xl">
        <CardHeader className="sticky top-0 z-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg p-4 md:p-6">
          <CardTitle className="text-2xl md:text-3xl font-bold text-center text-gray-800 dark:text-gray-100">
            Facial Recognition Attendance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 flex flex-col items-center">
          <Tabs defaultValue="register" className="space-y-4 md:space-y-6 w-full">
            <TabsList className="grid grid-cols-3 gap-2 md:gap-4 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
              <TabsTrigger value="register" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-600">Register</TabsTrigger>
              <TabsTrigger value="attendance" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-600">Attendance</TabsTrigger>
              <TabsTrigger value="reports" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-600">Reports</TabsTrigger>
            </TabsList>
            <TabsContent value="register" className="space-y-4 w-full">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-24 h-24 md:w-32 md:h-32 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden">
                  {registerImagePreview ? (
                    <Image src={registerImagePreview} alt="Selected" layout="fill" objectFit="cover" />
                  ) : (
                    <Camera className="w-8 h-8 md:w-12 md:h-12 text-gray-400" />
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleImageUpload(e, 'register')}
                  ref={registerInputRef}
                  className="hidden"
                />
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => registerInputRef.current?.click()}>
                    Upload or Take Photo
                  </Button>
                  {isWebcamAvailable && (
                    <Button variant="outline" onClick={() => { setCameraType('register'); setIsCameraOpen(true) }}>
                      Use Webcam
                    </Button>
                  )}
                </div>
                <Input
                  placeholder="Enter User ID"
                  className="max-w-xs w-full"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                />
                <Button className="w-full max-w-xs" onClick={handleRegister}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Register User
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="attendance" className="space-y-4 w-full">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-32 h-32 md:w-48 md:h-48 bg-gray-200 dark:bg-gray-700 rounded-2xl flex items-center justify-center overflow-hidden">
                  {attendanceImagePreview ? (
                    <Image src={attendanceImagePreview} alt="Selected" layout="fill" objectFit="cover" />
                  ) : (
                    <Camera className="w-12 h-12 md:w-16 md:h-16 text-gray-400" />
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleImageUpload(e, 'attendance')}
                  ref={attendanceInputRef}
                  className="hidden"
                />
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => attendanceInputRef.current?.click()}>
                    Upload or Take Photo
                  </Button>
                  {isWebcamAvailable && (
                    <Button variant="outline" onClick={() => { setCameraType('attendance'); setIsCameraOpen(true) }}>
                      Use Webcam
                    </Button>
                  )}
                </div>
                <Button className="w-full max-w-xs" onClick={handleLogAttendance}>
                  <Clock className="w-4 h-4 mr-2" />
                  Log Attendance
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="reports" className="flex flex-col items-center">
              <div className="flex flex-col items-center">
                <Calendar
                  mode="range"
                  selected={selectedDates}
                  onSelect={handleDateSelect}
                  className="rounded-md border"
                />
                <Button className="mt-4" onClick={handleGenerateReport}>
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Report
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between p-4 md:p-6 bg-gray-50 dark:bg-gray-800/50 gap-4">
          <Button variant="outline" className="w-full sm:w-auto" onClick={handleListUsers}>
            <Users className="w-4 h-4 mr-2" />
            List Users
          </Button>
          <Button variant="outline" className="w-full sm:w-auto text-red-500 hover:text-red-700" onClick={handleDeleteUser}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete User
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notification</DialogTitle>
          </DialogHeader>
          <pre className="whitespace-pre-wrap">{dialogContent}</pre>
          <Button onClick={() => setIsDialogOpen(false)} className="mt-4">
            Close
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Use Webcam</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center">
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode: 'user' }}
              className="w-full h-auto rounded-md"
            />
            <Button onClick={capturePhoto} className="mt-4">
              Capture Photo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

