import { db } from './firebase';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';

/**
 * 指定されたユーザーの重複する履歴項目を削除する
 * @param userId ユーザーID
 * @param data 新しく追加されるデータ
 * @returns 削除対象の既存履歴に含まれていたメモ（存在する場合）
 */
export const removeDuplicateHistory = async (userId: string, data: string): Promise<string | undefined> => {
  if (!db) return undefined;

  try {
    // 同じユーザーの同じデータを持つドキュメントを検索
    const q = query(
      collection(db, "scanHistory"),
      where("userId", "==", userId),
      where("data", "==", data)
    );
    
    const querySnapshot = await getDocs(q);
    const existingMemo = querySnapshot.docs
      .map((docSnapshot) => {
        const memo = docSnapshot.data().memo;
        return typeof memo === 'string' && memo.trim() ? memo : undefined;
      })
      .find((memo) => memo !== undefined);
    
    // 既存のドキュメントがある場合、すべて削除
    const deletePromises = querySnapshot.docs.map(async (docToDelete) => {
      if (db) {
        await deleteDoc(doc(db, "scanHistory", docToDelete.id));
        console.log(`Deleted duplicate history item: ${docToDelete.id}`);
      }
    });
    
    await Promise.all(deletePromises);
    return existingMemo;
  } catch (error) {
    console.error("Error removing duplicate history:", error);
    return undefined;
  }
};

/**
 * ローカル履歴から重複を削除する
 * @param history 現在の履歴配列
 * @param newData 新しく追加するデータ
 * @returns 重複を削除した履歴配列
 */
export const removeDuplicateFromLocalHistory = <T extends { data: string }>(
  history: T[], 
  newData: string
): T[] => {
  return history.filter(item => item.data !== newData);
};

/**
 * 履歴配列から重複を削除（最新のもののみ残す）
 * @param history 履歴配列
 * @returns 重複を削除した履歴配列
 */
export const deduplicateHistory = <T extends { data: string; timestamp: Date | { seconds: number } | null }>(
  history: T[]
): T[] => {
  const seen = new Set<string>();
  const result: T[] = [];
  
  // 最新順でソートされていることを前提に、最初に見つかったものを保持
  for (const item of history) {
    if (!seen.has(item.data)) {
      seen.add(item.data);
      result.push(item);
    }
  }
  
  return result;
};
