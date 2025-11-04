// FIX: Use Firebase v8 compat import
import firebase from "firebase/compat/app";
import {
  auth,
} from "./firebase";

export interface UserProfile {
  uid: string;
  name: string | null;
  email: string | null;
  picture: string | null;
}

// FIX: Use Firebase v8 syntax for Auth provider
const provider = new firebase.auth.GoogleAuthProvider();

export const signInWithGoogle = async (): Promise<UserProfile> => {
  // FIX: Use Firebase v8 syntax for signInWithPopup
  const result = await auth.signInWithPopup(provider);
  if (!result.user) {
    throw new Error("User not found after sign in.");
  }
  const { uid, displayName, email, photoURL } = result.user;
  const userProfile: UserProfile = { uid, name: displayName, email, picture: photoURL };
  return userProfile;
};

export const signOut = (): Promise<void> => {
  // FIX: Use Firebase v8 syntax for signOut
  return auth.signOut();
};

export const onAuthChange = (callback: (user: UserProfile | null) => void): (() => void) => {
  // FIX: Use Firebase v8 syntax for onAuthStateChanged and User type
  return auth.onAuthStateChanged((user: firebase.User | null) => {
    if (user) {
      const { uid, displayName, email, photoURL } = user;
      callback({ uid, name: displayName, email, picture: photoURL });
    } else {
      callback(null);
    }
  });
};
