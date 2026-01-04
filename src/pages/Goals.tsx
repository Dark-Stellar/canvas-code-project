import { useEffect, useState, useCallback, useMemo } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { getAllDailyReports } from "@/lib/storage";
import { Target, Plus, Trash2, TrendingUp, Rocket, Edit2, Check, X } from "lucide-react";
import { toast } from "sonner";
import type { ProductivityGoal, Mission } from "@/types";
import { cn } from "@/lib/utils";

const MISSION_CATEGORIES = [
  { value: 'personal', label: 'Personal' },
  { value: 'career', label: 'Career' },
  { value: 'health', label: 'Health' },
  { value: 'learning', label: 'Learning' },
  { value: 'financial', label: 'Financial' },
  { value: 'creative', label: 'Creative' },
  { value: 'social', label: 'Social' },
  { value: 'other', label: 'Other' },
];

const Goals = () => {
  const [goals, setGoals] = useState<ProductivityGoal[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showMissionForm, setShowMissionForm] = useState(false);
  const [goalType, setGoalType] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [targetPercentage, setTargetPercentage] = useState(75);
  
  const [missionTitle, setMissionTitle] = useState('');
  const [missionDescription, setMissionDescription] = useState('');
  const [missionCategory, setMissionCategory] = useState('personal');
  const [missionTargetDate, setMissionTargetDate] = useState('');
  
  const [editingMission, setEditingMission] = useState<string | null>(null);
  const [editProgress, setEditProgress] = useState(0);
  const [progressData, setProgressData] = useState<{ [key: string]: number }>({});
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const [goalsRes, missionsRes] = await Promise.all([
      supabase.from('productivity_goals').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('missions').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    ]);
    
    if (goalsRes.data) {
      setGoals(goalsRes.data.map(g => ({
        id: g.id,
        goalType: g.goal_type as 'daily' | 'weekly' | 'monthly',
        targetPercentage: g.target_percentage,
        startDate: g.start_date,
        endDate: g.end_date,
        createdAt: g.created_at
      })));
    }
    
    if (missionsRes.data) {
      setMissions(missionsRes.data.map(m => ({
        id: m.id,
        title: m.title,
        description: m.description || undefined,
        progressPercent: Number(m.progress_percent),
        category: m.category || 'personal',
        targetDate: m.target_date || undefined,
        isCompleted: m.is_completed,
        createdAt: m.created_at,
        updatedAt: m.updated_at
      })));
    }
    
    setLoading(false);
  }, []);
  
  useEffect(() => {
    const loadProgress = async () => {
      const reports = await getAllDailyReports();
      const data: { [key: string]: number } = {};
      for (const goal of goals) {
        const relevantReports = reports.filter(r => r.date >= goal.startDate && r.date <= goal.endDate);
        data[goal.id] = relevantReports.length > 0 ? relevantReports.reduce((sum, r) => sum + r.productivityPercent, 0) / relevantReports.length : 0;
      }
      setProgressData(data);
    };
    if (goals.length > 0) loadProgress();
  }, [goals]);
  
  const createGoal = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    let endDate: string;
    
    if (goalType === 'daily') {
      endDate = startDate;
    } else if (goalType === 'weekly') {
      const end = new Date(today);
      end.setDate(end.getDate() + 7);
      endDate = end.toISOString().split('T')[0];
    } else {
      const end = new Date(today);
      end.setMonth(end.getMonth() + 1);
      endDate = end.toISOString().split('T')[0];
    }
    
    const { error } = await supabase.from('productivity_goals').insert({
      user_id: user.id,
      goal_type: goalType,
      target_percentage: targetPercentage,
      start_date: startDate,
      end_date: endDate
    });
    
    if (error) {
      toast.error('Failed to create goal');
    } else {
      toast.success('Goal created!');
      setShowGoalForm(false);
      loadData();
    }
  }, [goalType, targetPercentage, loadData]);
  
  const deleteGoal = useCallback(async (id: string) => {
    const { error } = await supabase.from('productivity_goals').delete().eq('id', id);
    if (error) toast.error('Failed to delete goal');
    else { toast.success('Goal deleted'); loadData(); }
  }, [loadData]);
  
  const createMission = useCallback(async () => {
    if (!missionTitle.trim()) { toast.error('Mission title is required'); return; }
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { error } = await supabase.from('missions').insert({
      user_id: user.id,
      title: missionTitle.trim(),
      description: missionDescription.trim() || null,
      category: missionCategory,
      target_date: missionTargetDate || null,
      progress_percent: 0,
      is_completed: false
    });
    
    if (error) toast.error('Failed to create mission');
    else {
      toast.success('Mission created!');
      setShowMissionForm(false);
      setMissionTitle('');
      setMissionDescription('');
      setMissionCategory('personal');
      setMissionTargetDate('');
      loadData();
    }
  }, [missionTitle, missionDescription, missionCategory, missionTargetDate, loadData]);
  
  const updateMissionProgress = useCallback(async (id: string, progress: number) => {
    const isCompleted = progress >= 100;
    const { error } = await supabase.from('missions').update({ 
      progress_percent: Math.min(100, Math.max(0, progress)),
      is_completed: isCompleted,
      updated_at: new Date().toISOString()
    }).eq('id', id);
    
    if (error) toast.error('Failed to update progress');
    else { if (isCompleted) toast.success('Mission completed! 🎉'); setEditingMission(null); loadData(); }
  }, [loadData]);
  
  const deleteMission = useCallback(async (id: string) => {
    const { error } = await supabase.from('missions').delete().eq('id', id);
    if (error) toast.error('Failed to delete mission');
    else { toast.success('Mission deleted'); loadData(); }
  }, [loadData]);
  
  const activeMissions = useMemo(() => missions.filter(m => !m.isCompleted), [missions]);
  const completedMissions = useMemo(() => missions.filter(m => m.isCompleted), [missions]);
  
  if (loading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </MobileLayout>
    );
  }
  
  return (
    <MobileLayout>
      <div className="container max-w-lg mx-auto px-4 py-3 space-y-3">
        <PageHeader title="Goals & Missions" subtitle="Set targets and track progress" icon={Target} />
        
        <Tabs defaultValue="goals" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="goals">Goals</TabsTrigger>
            <TabsTrigger value="missions">Missions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="goals" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowGoalForm(!showGoalForm)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Goal
              </Button>
            </div>
            
            {showGoalForm && (
              <Card className="p-4 space-y-4">
                <h3 className="font-semibold">Create New Goal</h3>
                <div className="space-y-2">
                  <Label>Goal Type</Label>
                  <Select value={goalType} onValueChange={(v) => setGoalType(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Target Productivity (%)</Label>
                  <Input type="number" min="0" max="100" value={targetPercentage} onChange={(e) => setTargetPercentage(Math.max(0, Math.min(100, Number(e.target.value))))} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={createGoal} className="flex-1">Create Goal</Button>
                  <Button onClick={() => setShowGoalForm(false)} variant="outline">Cancel</Button>
                </div>
              </Card>
            )}
            
            <div className="space-y-3">
              {goals.length === 0 && !showGoalForm && (
                <Card className="p-6 text-center">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground mb-4">No goals yet</p>
                  <Button onClick={() => setShowGoalForm(true)}><Plus className="h-4 w-4 mr-2" />Create Your First Goal</Button>
                </Card>
              )}
              
              {goals.map((goal) => {
                const progress = progressData[goal.id] || 0;
                const isAchieved = progress >= goal.targetPercentage;
                const daysLeft = Math.ceil((new Date(goal.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                const isActive = daysLeft >= 0;
                
                return (
                  <Card key={goal.id} className={cn("p-4", isAchieved && "border-success")}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", isAchieved ? 'bg-success/10' : 'bg-primary/10')}>
                          {isAchieved ? <TrendingUp className="h-5 w-5 text-success" /> : <Target className="h-5 w-5 text-primary" />}
                        </div>
                        <div>
                          <h3 className="font-semibold capitalize">{goal.goalType} Goal</h3>
                          <p className="text-xs text-muted-foreground">{new Date(goal.startDate).toLocaleDateString()} - {new Date(goal.endDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteGoal(goal.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Target: {goal.targetPercentage}%</span>
                        <span className={cn("font-bold", isAchieved && 'text-success')}>Current: {Math.round(progress)}%</span>
                      </div>
                      <Progress value={(progress / goal.targetPercentage) * 100} className="h-2" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{isActive ? (daysLeft === 0 ? 'Ends today' : daysLeft === 1 ? '1 day left' : `${daysLeft} days left`) : 'Expired'}</span>
                        {isAchieved && <span className="text-success font-semibold">✓ Achieved!</span>}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
          
          <TabsContent value="missions" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowMissionForm(!showMissionForm)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Mission
              </Button>
            </div>
            
            {showMissionForm && (
              <Card className="p-4 space-y-4">
                <h3 className="font-semibold">Create New Mission</h3>
                <div className="space-y-2">
                  <Label>Mission Title *</Label>
                  <Input placeholder="e.g., Learn Spanish..." value={missionTitle} onChange={(e) => setMissionTitle(e.target.value)} maxLength={100} />
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea placeholder="Describe your mission..." value={missionDescription} onChange={(e) => setMissionDescription(e.target.value)} maxLength={500} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={missionCategory} onValueChange={setMissionCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MISSION_CATEGORIES.map(cat => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Target Date</Label>
                    <Input type="date" value={missionTargetDate} onChange={(e) => setMissionTargetDate(e.target.value)} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={createMission} className="flex-1">Create Mission</Button>
                  <Button onClick={() => setShowMissionForm(false)} variant="outline">Cancel</Button>
                </div>
              </Card>
            )}
            
            <div className="space-y-3">
              {missions.length === 0 && !showMissionForm && (
                <Card className="p-6 text-center">
                  <Rocket className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground mb-2">No missions yet</p>
                  <p className="text-xs text-muted-foreground mb-4">Create a mission to track any goal with a progress bar</p>
                  <Button onClick={() => setShowMissionForm(true)}><Plus className="h-4 w-4 mr-2" />Create Your First Mission</Button>
                </Card>
              )}
              
              {activeMissions.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">Active Missions</h3>
                  <div className="space-y-3">
                    {activeMissions.map(mission => (
                      <Card key={mission.id} className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                              <Rocket className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold">{mission.title}</h3>
                              <p className="text-xs text-muted-foreground capitalize">{mission.category}</p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {editingMission === mission.id ? (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => updateMissionProgress(mission.id, editProgress)}><Check className="h-4 w-4 text-success" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => setEditingMission(null)}><X className="h-4 w-4" /></Button>
                              </>
                            ) : (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => { setEditingMission(mission.id); setEditProgress(mission.progressPercent); }}><Edit2 className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => deleteMission(mission.id)}><Trash2 className="h-4 w-4" /></Button>
                              </>
                            )}
                          </div>
                        </div>
                        {mission.description && <p className="text-sm text-muted-foreground mb-3">{mission.description}</p>}
                        <div className="space-y-2">
                          {editingMission === mission.id ? (
                            <div className="space-y-2">
                              <Slider value={[editProgress]} min={0} max={100} step={5} onValueChange={([v]) => setEditProgress(v)} />
                              <div className="text-center font-bold text-primary">{editProgress}%</div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Progress</span>
                                <span className="font-bold text-primary">{mission.progressPercent}%</span>
                              </div>
                              <Progress value={mission.progressPercent} className="h-2" />
                            </>
                          )}
                          {mission.targetDate && (
                            <div className="text-xs text-muted-foreground">Target: {new Date(mission.targetDate).toLocaleDateString()}</div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              
              {completedMissions.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">Completed</h3>
                  <div className="space-y-3">
                    {completedMissions.map(mission => (
                      <Card key={mission.id} className="p-4 border-success/50 bg-success/5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-success/20 flex items-center justify-center">
                              <Check className="h-4 w-4 text-success" />
                            </div>
                            <div>
                              <h3 className="font-semibold line-through opacity-70">{mission.title}</h3>
                              <p className="text-xs text-muted-foreground capitalize">{mission.category}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => deleteMission(mission.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
};

export default Goals;
