import UIKit
import Capacitor
import AVFoundation
import MediaPlayer

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Configure audio session for background recording
        configureAudioSession()
        return true
    }
    
    private func configureAudioSession() {
        do {
            let audioSession = AVAudioSession.sharedInstance()
            // Set category to playAndRecord to support both recording and playback
            // .allowBluetooth enables Bluetooth headset microphones
            // .defaultToSpeaker routes audio to speaker when no headphones (important for playback)
            try audioSession.setCategory(
                .playAndRecord,
                mode: .spokenAudio,
                options: [.allowBluetooth, .defaultToSpeaker, .allowAirPlay]
            )
            // Activate the session
            try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
            print("[AudioSession] Configured for background recording and playback")
        } catch {
            print("[AudioSession] Failed to configure: \(error.localizedDescription)")
        }
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Audio session will continue recording in background due to UIBackgroundModes audio
        print("[AppDelegate] App entered background - recording can continue")
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}

// MARK: - Native Tabs View Controller

final class NativeTabsViewController: CAPBridgeViewController, UITabBarDelegate {
    static weak var shared: NativeTabsViewController?
    private let tabBar = UITabBar()
    private let tabBarHeight: CGFloat = 49

    override func viewDidLoad() {
        super.viewDidLoad()
        NativeTabsViewController.shared = self
        setupTabBar()
        
        // Register custom native plugins
        bridge?.registerPluginInstance(NativeToastPlugin())
        bridge?.registerPluginInstance(NativeTabsPlugin())
        bridge?.registerPluginInstance(NativeSaveSheetPlugin())
        bridge?.registerPluginInstance(NativeRecordingPlugin())
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()

        let bottomInset = view.safeAreaInsets.bottom
        let height = tabBar.isHidden ? 0 : (tabBarHeight + bottomInset)
        tabBar.frame = CGRect(x: 0, y: view.bounds.height - height, width: view.bounds.width, height: height)

        if let webView = bridge?.webView {
            webView.scrollView.contentInset.bottom = height
            webView.scrollView.verticalScrollIndicatorInsets.bottom = height
            webView.scrollView.horizontalScrollIndicatorInsets.right = 0
        }
    }

    private func setupTabBar() {
        tabBar.delegate = self
        tabBar.items = [
            UITabBarItem(title: "Record", image: UIImage(systemName: "mic"), tag: 0),
            UITabBarItem(title: "Library", image: UIImage(systemName: "folder"), tag: 1),
            UITabBarItem(title: "Settings", image: UIImage(systemName: "gearshape"), tag: 2),
        ]
        tabBar.selectedItem = tabBar.items?.first
        tabBar.isTranslucent = true
        tabBar.backgroundImage = UIImage()
        tabBar.shadowImage = UIImage()

        if #available(iOS 15.0, *) {
            let appearance = UITabBarAppearance()
            appearance.configureWithTransparentBackground()
            appearance.backgroundEffect = UIBlurEffect(style: .systemUltraThinMaterial)
            appearance.backgroundColor = UIColor.systemBackground.withAlphaComponent(0.7)
            appearance.shadowColor = UIColor.black.withAlphaComponent(0.12)

            let itemAppearance = UITabBarItemAppearance()
            let activeColor = UIColor(red: 0.95, green: 0.48, blue: 0.38, alpha: 1)
            itemAppearance.normal.iconColor = UIColor.systemGray
            itemAppearance.normal.titleTextAttributes = [.foregroundColor: UIColor.systemGray]
            itemAppearance.selected.iconColor = activeColor
            itemAppearance.selected.titleTextAttributes = [.foregroundColor: activeColor]

            appearance.stackedLayoutAppearance = itemAppearance
            appearance.inlineLayoutAppearance = itemAppearance
            appearance.compactInlineLayoutAppearance = itemAppearance

            tabBar.standardAppearance = appearance
            tabBar.scrollEdgeAppearance = appearance
        }

        view.addSubview(tabBar)
    }

    func tabBar(_ tabBar: UITabBar, didSelect item: UITabBarItem) {
        guard let tabId = tabId(for: item.tag) else { return }
        let js = "window.dispatchEvent(new CustomEvent('nativeTabChange', { detail: { tab: '\(tabId)' } }))"
        bridge?.webView?.evaluateJavaScript(js, completionHandler: nil)
    }

    func setTabBarHidden(_ hidden: Bool, animated: Bool = true) {
        guard tabBar.isHidden != hidden else { return }
        tabBar.isHidden = hidden
        if animated {
            UIView.animate(withDuration: 0.2) {
                self.view.layoutIfNeeded()
            }
        } else {
            view.setNeedsLayout()
        }
    }

    private func tabId(for tag: Int) -> String? {
        switch tag {
        case 0: return "record"
        case 1: return "library"
        case 2: return "settings"
        default: return nil
        }
    }
}

// MARK: - Native Toast Plugin

@objc(NativeToastPlugin)
public class NativeToastPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeToastPlugin"
    public let jsName = "NativeToast"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "show", returnType: CAPPluginReturnPromise)
    ]
    
    @objc func show(_ call: CAPPluginCall) {
        let title = call.getString("title") ?? ""
        let description = call.getString("description")
        let duration = call.getDouble("duration") ?? 1.5
        let style = call.getString("style") ?? "success"

        DispatchQueue.main.async {
            NativeToastManager.shared.showToast(
                in: NativeTabsViewController.shared?.view,
                title: title,
                description: description,
                duration: duration,
                style: style
            )
            call.resolve()
        }
    }
}

private final class NativeToastManager {
    static let shared = NativeToastManager()
    private var toastView: UIView?
    private var dismissWorkItem: DispatchWorkItem?
    private var topConstraint: NSLayoutConstraint?

    func showToast(in container: UIView?, title: String, description: String?, duration: Double, style: String) {
        guard let container else { return }

        dismissWorkItem?.cancel()
        
        if let existing = toastView {
            existing.removeFromSuperview()
            toastView = nil
        }

        let blurEffect = UIBlurEffect(style: .systemMaterial)
        let wrapper = UIVisualEffectView(effect: blurEffect)
        wrapper.layer.cornerRadius = 14
        wrapper.clipsToBounds = true
        wrapper.layer.shadowColor = UIColor.black.cgColor
        wrapper.layer.shadowOpacity = 0.08
        wrapper.layer.shadowRadius = 8
        wrapper.layer.shadowOffset = CGSize(width: 0, height: 2)
        wrapper.translatesAutoresizingMaskIntoConstraints = false
        
        let iconView = UIImageView()
        iconView.contentMode = .scaleAspectFit
        iconView.translatesAutoresizingMaskIntoConstraints = false
        
        switch style {
        case "success":
            iconView.image = UIImage(systemName: "checkmark.circle.fill")
            iconView.tintColor = UIColor.systemGreen
        case "error":
            iconView.image = UIImage(systemName: "xmark.circle.fill")
            iconView.tintColor = UIColor.systemRed
        case "warning":
            iconView.image = UIImage(systemName: "exclamationmark.triangle.fill")
            iconView.tintColor = UIColor.systemOrange
        default:
            iconView.image = UIImage(systemName: "info.circle.fill")
            iconView.tintColor = UIColor.systemBlue
        }

        let titleLabel = UILabel()
        titleLabel.text = title
        titleLabel.font = UIFont.systemFont(ofSize: 15, weight: .semibold)
        titleLabel.numberOfLines = 1
        titleLabel.textColor = UIColor.label
        titleLabel.translatesAutoresizingMaskIntoConstraints = false

        let contentStack = UIStackView()
        contentStack.axis = .horizontal
        contentStack.alignment = .center
        contentStack.spacing = 10
        contentStack.translatesAutoresizingMaskIntoConstraints = false
        
        contentStack.addArrangedSubview(iconView)
        
        if let desc = description, !desc.isEmpty {
            let textStack = UIStackView()
            textStack.axis = .vertical
            textStack.spacing = 2
            
            let descLabel = UILabel()
            descLabel.text = desc
            descLabel.font = UIFont.systemFont(ofSize: 13)
            descLabel.numberOfLines = 1
            descLabel.textColor = UIColor.secondaryLabel
            
            textStack.addArrangedSubview(titleLabel)
            textStack.addArrangedSubview(descLabel)
            contentStack.addArrangedSubview(textStack)
        } else {
            contentStack.addArrangedSubview(titleLabel)
        }

        wrapper.contentView.addSubview(contentStack)
        container.addSubview(wrapper)

        let topInset = container.safeAreaInsets.top + 12
        let constraint = wrapper.topAnchor.constraint(equalTo: container.topAnchor, constant: -100)
        topConstraint = constraint
        
        NSLayoutConstraint.activate([
            wrapper.centerXAnchor.constraint(equalTo: container.centerXAnchor),
            wrapper.widthAnchor.constraint(lessThanOrEqualTo: container.widthAnchor, constant: -32),
            constraint,
            iconView.widthAnchor.constraint(equalToConstant: 22),
            iconView.heightAnchor.constraint(equalToConstant: 22),
            contentStack.leadingAnchor.constraint(equalTo: wrapper.contentView.leadingAnchor, constant: 14),
            contentStack.trailingAnchor.constraint(equalTo: wrapper.contentView.trailingAnchor, constant: -14),
            contentStack.topAnchor.constraint(equalTo: wrapper.contentView.topAnchor, constant: 12),
            contentStack.bottomAnchor.constraint(equalTo: wrapper.contentView.bottomAnchor, constant: -12),
        ])

        let tap = UITapGestureRecognizer(target: self, action: #selector(handleTap))
        wrapper.addGestureRecognizer(tap)
        
        let swipe = UISwipeGestureRecognizer(target: self, action: #selector(handleSwipe))
        swipe.direction = .up
        wrapper.addGestureRecognizer(swipe)

        toastView = wrapper
        
        container.layoutIfNeeded()

        UIView.animate(
            withDuration: 0.4,
            delay: 0,
            usingSpringWithDamping: 0.8,
            initialSpringVelocity: 0.5,
            options: [.curveEaseOut]
        ) {
            constraint.constant = topInset
            container.layoutIfNeeded()
        }

        let workItem = DispatchWorkItem { [weak self] in
            self?.dismissToast()
        }
        dismissWorkItem = workItem
        DispatchQueue.main.asyncAfter(deadline: .now() + duration, execute: workItem)
    }

    @objc private func handleTap() {
        dismissToast()
    }
    
    @objc private func handleSwipe() {
        dismissToast()
    }

    private func dismissToast() {
        dismissWorkItem?.cancel()
        guard let toast = toastView else { return }
        
        UIView.animate(
            withDuration: 0.25,
            delay: 0,
            options: [.curveEaseIn]
        ) {
            self.topConstraint?.constant = -100
            toast.superview?.layoutIfNeeded()
            toast.alpha = 0
        } completion: { _ in
            toast.removeFromSuperview()
            if self.toastView === toast {
                self.toastView = nil
            }
        }
    }
}

// MARK: - Native Tabs Plugin

@objc(NativeTabsPlugin)
public class NativeTabsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeTabsPlugin"
    public let jsName = "NativeTabs"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setHidden", returnType: CAPPluginReturnPromise)
    ]
    
    @objc func setHidden(_ call: CAPPluginCall) {
        let hidden = call.getBool("hidden") ?? false
        DispatchQueue.main.async {
            NativeTabsViewController.shared?.setTabBarHidden(hidden, animated: true)
            call.resolve()
        }
    }
}

// MARK: - Native Save Sheet Plugin

@objc(NativeSaveSheetPlugin)
public class NativeSaveSheetPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeSaveSheetPlugin"
    public let jsName = "NativeSaveSheet"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "present", returnType: CAPPluginReturnPromise)
    ]
    
    private var sheetController: SaveRecordingSheetViewController?

    @objc func present(_ call: CAPPluginCall) {
        let folders: [Any] = call.getArray("folders") ?? []
        let selectedFolderId = call.getString("selectedFolderId")

        var parsedFolders: [(id: String, name: String)] = []
        for item in folders {
            if let dict = item as? [String: Any],
               let id = dict["id"] as? String,
               let name = dict["name"] as? String {
                parsedFolders.append((id: id, name: name))
            }
        }

        let sheet = SaveRecordingSheetViewController(
            folders: parsedFolders,
            selectedFolderId: selectedFolderId,
            onSave: { [weak self] title, folderId in
                let js = "window.dispatchEvent(new CustomEvent('nativeSaveRecording', { detail: { title: '\(title.jsEscaped())', folderId: \(folderId != nil ? "'\(folderId!)'" : "null") } }))"
                self?.bridge?.webView?.evaluateJavaScript(js, completionHandler: nil)
            },
            onCancel: { }
        )

        sheetController = sheet
        if let presentation = sheet.sheetPresentationController {
            presentation.detents = [.medium(), .large()]
            presentation.prefersGrabberVisible = true
            presentation.preferredCornerRadius = 24
        }

        NativeTabsViewController.shared?.setTabBarHidden(true, animated: true)
        bridge?.viewController?.present(sheet, animated: true) {
            call.resolve()
        }
    }
}

private final class SaveRecordingSheetViewController: UIViewController {
    private let folders: [(id: String, name: String)]
    private var selectedFolderId: String?
    private var titleField: UITextField!
    private var folderButton: UIButton!
    private let onSave: (String, String?) -> Void
    private let onCancel: () -> Void

    init(
        folders: [(id: String, name: String)],
        selectedFolderId: String?,
        onSave: @escaping (String, String?) -> Void,
        onCancel: @escaping () -> Void
    ) {
        self.folders = folders
        self.selectedFolderId = selectedFolderId
        self.onSave = onSave
        self.onCancel = onCancel
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor.systemBackground

        let container = UIStackView()
        container.axis = .vertical
        container.spacing = 16
        container.translatesAutoresizingMaskIntoConstraints = false

        let titleLabel = UILabel()
        titleLabel.text = "Save Recording"
        titleLabel.font = UIFont.preferredFont(forTextStyle: .title2).withWeight(.semibold)

        titleField = UITextField()
        titleField.placeholder = "What's this about?"
        titleField.borderStyle = .roundedRect
        titleField.autocapitalizationType = .sentences

        folderButton = UIButton(type: .system)
        folderButton.setTitle(folderTitleText(), for: .normal)
        folderButton.contentHorizontalAlignment = .left
        folderButton.titleLabel?.font = UIFont.preferredFont(forTextStyle: .body)
        folderButton.layer.cornerRadius = 10
        folderButton.layer.borderWidth = 1
        folderButton.layer.borderColor = UIColor.separator.cgColor
        folderButton.contentEdgeInsets = UIEdgeInsets(top: 10, left: 12, bottom: 10, right: 12)
        folderButton.addTarget(self, action: #selector(openFolderPicker), for: .touchUpInside)

        let buttons = UIStackView()
        buttons.axis = .horizontal
        buttons.spacing = 12
        buttons.distribution = .fillEqually

        let cancelButton = UIButton(type: .system)
        cancelButton.setTitle("Cancel", for: .normal)
        cancelButton.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)

        let saveButton = UIButton(type: .system)
        saveButton.setTitle("Process & Save", for: .normal)
        saveButton.addTarget(self, action: #selector(saveTapped), for: .touchUpInside)

        buttons.addArrangedSubview(cancelButton)
        buttons.addArrangedSubview(saveButton)

        container.addArrangedSubview(titleLabel)
        container.addArrangedSubview(titleField)
        container.addArrangedSubview(folderButton)
        container.addArrangedSubview(buttons)

        view.addSubview(container)
        NSLayoutConstraint.activate([
            container.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            container.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            container.topAnchor.constraint(equalTo: view.topAnchor, constant: 20),
        ])
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        NativeTabsViewController.shared?.setTabBarHidden(false, animated: true)
    }

    private func folderTitleText() -> String {
        if let selectedFolderId,
           let folder = folders.first(where: { $0.id == selectedFolderId }) {
            return folder.name
        }
        return "No folder (Unfiled)"
    }

    @objc private func openFolderPicker() {
        let alert = UIAlertController(title: "Select Folder", message: nil, preferredStyle: .actionSheet)
        alert.addAction(UIAlertAction(title: "No folder (Unfiled)", style: .default, handler: { _ in
            self.selectedFolderId = nil
            self.folderButton.setTitle(self.folderTitleText(), for: .normal)
        }))
        for folder in folders {
            alert.addAction(UIAlertAction(title: folder.name, style: .default, handler: { _ in
                self.selectedFolderId = folder.id
                self.folderButton.setTitle(self.folderTitleText(), for: .normal)
            }))
        }
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel, handler: nil))
        present(alert, animated: true)
    }

    @objc private func cancelTapped() {
        onCancel()
        dismiss(animated: true)
    }

    @objc private func saveTapped() {
        onSave(titleField.text ?? "", selectedFolderId)
        dismiss(animated: true)
    }
}

// MARK: - Native Recording Plugin (Now Playing / Lock Screen)

@objc(NativeRecordingPlugin)
public class NativeRecordingPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeRecordingPlugin"
    public let jsName = "NativeRecording"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "startRecording", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopRecording", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateDuration", returnType: CAPPluginReturnPromise)
    ]
    
    private var recordingStartTime: Date?
    private var durationTimer: Timer?
    private var silentPlayer: AVAudioPlayer?
    
    @objc func startRecording(_ call: CAPPluginCall) {
        print("[NativeRecording] startRecording called")
        DispatchQueue.main.async {
            self.recordingStartTime = Date()
            self.startSilentAudio()
            self.setupNowPlaying()
            self.setupRemoteCommands()
            self.startDurationTimer()
            print("[NativeRecording] Setup complete")
            call.resolve()
        }
    }
    
    @objc func stopRecording(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.clearNowPlaying()
            self.recordingStartTime = nil
            self.durationTimer?.invalidate()
            self.durationTimer = nil
            self.silentPlayer?.stop()
            self.silentPlayer = nil
            call.resolve()
        }
    }
    
    @objc func updateDuration(_ call: CAPPluginCall) {
        let duration = call.getDouble("duration") ?? 0
        DispatchQueue.main.async {
            self.updateNowPlayingDuration(duration)
            call.resolve()
        }
    }
    
    // Play a near-silent audio loop so iOS treats us as an active audio app
    // This is required for the Now Playing / lock screen widget to appear
    private func startSilentAudio() {
        print("[NativeRecording] Starting silent audio for Now Playing widget")
        
        // Generate a tiny silent WAV in memory
        let sampleRate: Double = 44100
        let duration: Double = 1.0 // 1 second of silence
        let numSamples = Int(sampleRate * duration)
        
        var header = Data()
        let dataSize = numSamples * 2 // 16-bit mono
        let fileSize = 36 + dataSize
        
        // RIFF header
        header.append(contentsOf: [0x52, 0x49, 0x46, 0x46]) // "RIFF"
        header.append(contentsOf: withUnsafeBytes(of: UInt32(fileSize).littleEndian) { Array($0) })
        header.append(contentsOf: [0x57, 0x41, 0x56, 0x45]) // "WAVE"
        
        // fmt chunk
        header.append(contentsOf: [0x66, 0x6D, 0x74, 0x20]) // "fmt "
        header.append(contentsOf: withUnsafeBytes(of: UInt32(16).littleEndian) { Array($0) }) // chunk size
        header.append(contentsOf: withUnsafeBytes(of: UInt16(1).littleEndian) { Array($0) }) // PCM
        header.append(contentsOf: withUnsafeBytes(of: UInt16(1).littleEndian) { Array($0) }) // mono
        header.append(contentsOf: withUnsafeBytes(of: UInt32(44100).littleEndian) { Array($0) }) // sample rate
        header.append(contentsOf: withUnsafeBytes(of: UInt32(88200).littleEndian) { Array($0) }) // byte rate
        header.append(contentsOf: withUnsafeBytes(of: UInt16(2).littleEndian) { Array($0) }) // block align
        header.append(contentsOf: withUnsafeBytes(of: UInt16(16).littleEndian) { Array($0) }) // bits per sample
        
        // data chunk
        header.append(contentsOf: [0x64, 0x61, 0x74, 0x61]) // "data"
        header.append(contentsOf: withUnsafeBytes(of: UInt32(dataSize).littleEndian) { Array($0) })
        
        // Silent samples (all zeros)
        header.append(Data(count: dataSize))
        
        do {
            let player = try AVAudioPlayer(data: header)
            player.numberOfLoops = -1 // Loop forever
            player.volume = 0.01 // Near-silent
            player.play()
            self.silentPlayer = player
            print("[NativeRecording] Silent audio playing")
        } catch {
            print("[NativeRecording] Failed to start silent audio: \(error)")
        }
    }
    
    private func setupNowPlaying() {
        var nowPlayingInfo: [String: Any] = [
            MPMediaItemPropertyTitle: "ThoughtSpark",
            MPMediaItemPropertyArtist: "Keep going, I'm listening...",
            MPMediaItemPropertyAlbumTitle: "Recording in progress",
            MPNowPlayingInfoPropertyIsLiveStream: true,
            MPNowPlayingInfoPropertyPlaybackRate: 1.0,
            MPNowPlayingInfoPropertyElapsedPlaybackTime: 0.0
        ]
        
        // Add app icon as artwork
        if let iconImage = UIImage(named: "AppIcon-512@2x") {
            let artwork = MPMediaItemArtwork(boundsSize: iconImage.size) { _ in iconImage }
            nowPlayingInfo[MPMediaItemPropertyArtwork] = artwork
        } else if let iconImage = UIApplication.shared.icon {
            let artwork = MPMediaItemArtwork(boundsSize: iconImage.size) { _ in iconImage }
            nowPlayingInfo[MPMediaItemPropertyArtwork] = artwork
        }
        
        MPNowPlayingInfoCenter.default().nowPlayingInfo = nowPlayingInfo
        UIApplication.shared.beginReceivingRemoteControlEvents()
        print("[NowPlaying] Now playing info set with silent audio backing")
    }
    
    private func updateNowPlayingDuration(_ duration: Double) {
        var nowPlayingInfo = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [:]
        nowPlayingInfo[MPNowPlayingInfoPropertyElapsedPlaybackTime] = duration
        
        let minutes = Int(duration) / 60
        let seconds = Int(duration) % 60
        
        nowPlayingInfo[MPMediaItemPropertyTitle] = "ThoughtSpark"
        nowPlayingInfo[MPMediaItemPropertyArtist] = String(format: "Recording %d:%02d — Keep going!", minutes, seconds)
        
        MPNowPlayingInfoCenter.default().nowPlayingInfo = nowPlayingInfo
    }
    
    private func startDurationTimer() {
        durationTimer?.invalidate()
        durationTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            guard let self = self, let startTime = self.recordingStartTime else { return }
            let elapsed = Date().timeIntervalSince(startTime)
            self.updateNowPlayingDuration(elapsed)
        }
    }
    
    private func setupRemoteCommands() {
        let commandCenter = MPRemoteCommandCenter.shared()
        
        commandCenter.togglePlayPauseCommand.isEnabled = true
        commandCenter.togglePlayPauseCommand.addTarget { [weak self] _ in
            let js = "window.dispatchEvent(new CustomEvent('nativeRecordingToggle'))"
            self?.bridge?.webView?.evaluateJavaScript(js, completionHandler: nil)
            return .success
        }
        
        commandCenter.playCommand.isEnabled = true
        commandCenter.playCommand.addTarget { _ in return .success }
        
        commandCenter.pauseCommand.isEnabled = true
        commandCenter.pauseCommand.addTarget { _ in return .success }
        
        commandCenter.stopCommand.isEnabled = false
        commandCenter.nextTrackCommand.isEnabled = false
        commandCenter.previousTrackCommand.isEnabled = false
    }
    
    private func clearNowPlaying() {
        MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
        UIApplication.shared.endReceivingRemoteControlEvents()
        
        let commandCenter = MPRemoteCommandCenter.shared()
        commandCenter.togglePlayPauseCommand.removeTarget(nil)
        commandCenter.playCommand.removeTarget(nil)
        commandCenter.pauseCommand.removeTarget(nil)
    }
}

// MARK: - Extensions

private extension String {
    func jsEscaped() -> String {
        return replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")
            .replacingOccurrences(of: "\n", with: "\\n")
            .replacingOccurrences(of: "\r", with: "\\r")
    }
}

private extension UIFont {
    func withWeight(_ weight: UIFont.Weight) -> UIFont {
        let traits: [UIFontDescriptor.TraitKey: Any] = [
            UIFontDescriptor.TraitKey.weight: weight
        ]
        let descriptor = fontDescriptor.addingAttributes([
            UIFontDescriptor.AttributeName.traits: traits
        ])
        return UIFont(descriptor: descriptor, size: pointSize)
    }
}

extension UIApplication {
    var icon: UIImage? {
        guard let iconsDictionary = Bundle.main.infoDictionary?["CFBundleIcons"] as? [String: Any],
              let primaryIconsDictionary = iconsDictionary["CFBundlePrimaryIcon"] as? [String: Any],
              let iconFiles = primaryIconsDictionary["CFBundleIconFiles"] as? [String],
              let lastIcon = iconFiles.last else { return nil }
        return UIImage(named: lastIcon)
    }
}
