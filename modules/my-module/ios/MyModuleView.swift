import ExpoModulesCore
import AVFoundation

class MyModuleView: ExpoView {

    private let captureSession = AVCaptureSession()

    private var previewLayer: AVCaptureVideoPreviewLayer?

    private let sessionQueue = DispatchQueue(
        label: "camera.session.queue"
    )

    required init(appContext: AppContext? = nil) {
        super.init(appContext: appContext)

        clipsToBounds = true

        checkCameraPermission()
    }

    override func layoutSubviews() {
        super.layoutSubviews()

        previewLayer?.frame = bounds
    }

    private func checkCameraPermission() {

        let status =
            AVCaptureDevice.authorizationStatus(
                for: .video
            )

        switch status {

        case .authorized:
            setupCamera()

        case .notDetermined:
            AVCaptureDevice.requestAccess(
                for: .video
            ) { [weak self] granted in

                if granted {
                    self?.setupCamera()
                }
            }

        default:
            print("Camera permission denied")
        }
    }

    private func setupCamera() {

        sessionQueue.async { [weak self] in

            guard let self else {
                return
            }

            self.captureSession.beginConfiguration()

            self.captureSession.sessionPreset = .photo

            guard let camera =
                AVCaptureDevice.default(
                    .builtInWideAngleCamera,
                    for: .video,
                    position: .back
                )
            else {
                print("Camera not found")

                self.captureSession.commitConfiguration()
                return
            }

            do {

                let input =
                    try AVCaptureDeviceInput(
                        device: camera
                    )

                if self.captureSession.canAddInput(input) {
                    self.captureSession.addInput(input)
                }

            } catch {

                print("Cannot create camera input")

                self.captureSession.commitConfiguration()
                return
            }

            self.captureSession.commitConfiguration()

            DispatchQueue.main.async {

                let preview =
                    AVCaptureVideoPreviewLayer(
                        session: self.captureSession
                    )

                preview.videoGravity =
                    .resizeAspectFill

                preview.frame =
                    self.bounds

                self.layer.insertSublayer(
                    preview,
                    at: 0
                )

                self.previewLayer =
                    preview
            }

            self.captureSession.startRunning()
        }
    }
}