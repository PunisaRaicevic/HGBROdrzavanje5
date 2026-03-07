import { supabase } from "../../lib/supabase";

export interface IChatStorage {
  getConversation(id: number): Promise<any>;
  getAllConversations(): Promise<any[]>;
  createConversation(title: string): Promise<any>;
  deleteConversation(id: number): Promise<void>;
  getMessagesByConversation(conversationId: number): Promise<any[]>;
  createMessage(conversationId: number, role: string, content: string): Promise<any>;
}

export const chatStorage: IChatStorage = {
  async getConversation(id: number) {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async getAllConversations() {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createConversation(title: string) {
    const { data, error } = await supabase
      .from('conversations')
      .insert({ title })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteConversation(id: number) {
    const { error: err1 } = await supabase.from('messages').delete().eq('conversation_id', id);
    if (err1) throw err1;
    const { error: err2 } = await supabase.from('conversations').delete().eq('id', id);
    if (err2) throw err2;
  },

  async getMessagesByConversation(conversationId: number) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async createMessage(conversationId: number, role: string, content: string) {
    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, role, content })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

