import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      case TargetPlatform.macOS:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for macos - '
          'you can reconfigure this by running the FlutterFire CLI again.',
        );
      case TargetPlatform.windows:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for windows - '
          'you can reconfigure this by running the FlutterFire CLI again.',
        );
      case TargetPlatform.linux:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for linux - '
          'you can reconfigure this by running the FlutterFire CLI again.',
        );
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not supported for this platform.',
        );
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyA4rvIHg0Mb9qAk4O1id9kyFHB_u_DyYXk',
    appId: '1:417289905381:web:af8270b11aca9e2fc0200c',
    messagingSenderId: '417289905381',
    projectId: 'spend-sight-8482',
    authDomain: 'spend-sight-8482.firebaseapp.com',
    storageBucket: 'spend-sight-8482.firebasestorage.app',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyA4rvIHg0Mb9qAk4O1id9kyFHB_u_DyYXk',
    appId: '1:417289905381:android:af8270b11aca9e2fc0200c',
    messagingSenderId: '417289905381',
    projectId: 'spend-sight-8482',
    storageBucket: 'spend-sight-8482.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyA4rvIHg0Mb9qAk4O1id9kyFHB_u_DyYXk',
    appId: '1:417289905381:ios:af8270b11aca9e2fc0200c',
    messagingSenderId: '417289905381',
    projectId: 'spend-sight-8482',
    storageBucket: 'spend-sight-8482.firebasestorage.app',
    iosBundleId: 'com.splitsight.app',
  );
}
