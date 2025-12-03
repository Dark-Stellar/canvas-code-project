import { useEffect, useState } from "react";
import { MobileLayout } from "@/components/MobileLayout";
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
import { Target, Plus, Trash2, TrendingUp, Rocket, Edit2, Check, X, Bell } from "lucide-react";
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
  
  // Mission form state
  const [missionTitle, setMissionTitle] = useState('');
  const [missionDescription, setMissionDescription] = useState('');
  const [missionCategory, setMissionCategory] = useState('personal');
  const [missionTargetDate, setMissionTargetDate] = useState('');
  
  // Edit mission state
  const [editingMission, setEditingMission] = useState<string | null>(null);
  const [editProgress, setEditProgress] = useState(0);
  
  useEffect(() => {
    loadData();
  }, []);
  
  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // Load goals
    const { data: goalsData } = await supabase
      .from('productivity_goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (goalsData) {
      setGoals(goalsData.map(g => ({
        id: g.id,
        goalType: g.goal_type as 'daily' | 'weekly' | 'monthly',
        targetPercentage: g.target_percentage,
        startDate: g.start_date,
        endDate: g.end_date,
        createdAt: g.created_at
      })));
    }
    
    // Load missions
    const { data: missionsData } = await supabase
      .from('missions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (missionsData) {
      setMissions(missionsData.map(m => ({
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
  }
  
  async function createGoal() {
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
    
    const { error } = await supabase
      .from('productivity_goals')
      .insert({
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
  }
  
  async function deleteGoal(id: string) {
    const { error } = await supabase
      .from('productivity_goals')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Failed to delete goal');
    } else {
      toast.success('Goal deleted');
      loadData();
    }
  }
  
  async function createMission() {
    if (!missionTitle.trim()) {
      toast.error('Mission title is required');
      return;
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { error } = await supabase
      .from('missions')
      .insert({
        user_id: user.id,
        title: missionTitle.trim(),
        description: missionDescription.trim() || null,
        category: missionCategory,
        target_date: missionTargetDate || null,
        progress_percent: 0,
        is_completed: false
      });
    
    if (error) {
      toast.error('Failed to create mission');
    } else {
      toast.success('Mission created!');
      setShowMissionForm(false);
      setMissionTitle('');
      setMissionDescription('');
      setMissionCategory('personal');
      setMissionTargetDate('');
      loadData();
    }
  }
  
  async function updateMissionProgress(id: string, progress: number) {
    const isCompleted = progress >= 100;
    
    const { error } = await supabase
      .from('missions')
      .update({ 
        progress_percent: Math.min(100, Math.max(0, progress)),
        is_completed: isCompleted,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) {
      toast.error('Failed to update progress');
    } else {
      if (isCompleted) {
        toast.success('Mission completed! 🎉');
      }
      setEditingMission(null);
      loadData();
    }
  }
  
  async function deleteMission(id: string) {
    const { error } = await supabase
      .from('missions')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Failed to delete mission');
    } else {
      toast.success('Mission deleted');
      loadData();
    }
  }
  
  const [progressData, setProgressData] = useState<{ [key: string]: number }>({});
  
  useEffect(() => {
    async function loadProgress() {
      const reports = await getAllDailyReports();
      const data: { [key: string]: number } = {};
      
      for (const goal of goals) {
        const relevantReports = reports.filter(r => 
          r.date >= goal.startDate && r.date <= goal.endDate
        );
        if (relevantReports.length > 0) {
          data[goal.id] = relevantReports.reduce((sum, r) => sum + r.productivityPercent, 0) / relevantReports.length;
        } else {
          data[goal.id] = 0;
        }
      }
      setProgressData(data);
    }
    if (goals.length > 0) {
      loadProgress();
    }
  }, [goals]);
  
  if (loading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </MobileLayout>
    );
  }
  
  return (
    <MobileLayout>
      <div className="container max-w-2xl mx-auto p-4 space-y-4">
        <div className="pt-4">
          <div className="flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Goals & Missions</h1>
          </div>
          <p className="text-sm text-muted-foreground">Set targets and track your missions</p>
        </div>
        
        <Tabs defaultValue="goals" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="goals">Productivity Goals</TabsTrigger>
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
                  <Select value={goalType} onValueChange={(v) => setGoalType(v as 'daily' | 'weekly' | 'monthly')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Target Productivity (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={targetPercentage}
                    onChange={(e) => setTargetPercentage(Math.max(0, Math.min(100, Number(e.target.value))))}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={createGoal} className="flex-1">
                    Create Goal
                  </Button>
                  <Button onClick={() => setShowGoalForm(false)} variant="outline">
                    Cancel
                  </Button>
                </div>
              </Card>
            )}
            
            <div className="space-y-3">
              {goals.length === 0 && !showGoalForm && (
                <Card className="p-6 text-center">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground mb-4">No goals yet</p>
                  <Button onClick={() => setShowGoalForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Goal
                  </Button>
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
                        <div className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center",
                          isAchieved ? 'bg-success/10' : 'bg-primary/10'
                        )}>
                          {isAchieved ? (
                            <TrendingUp className="h-5 w-5 text-success" />
                          ) : (
                            <Target className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold capitalize">{goal.goalType} Goal</h3>
                          <p className="text-xs text-muted-foreground">
                            {new Date(goal.startDate).toLocaleDateString()} - {new Date(goal.endDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteGoal(goal.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Target: {goal.targetPercentage}%</span>
                        <span className={cn("font-bold", isAchieved && 'text-success')}>
                          Current: {Math.round(progress)}%
                        </span>
                      </div>
                      <Progress value={(progress / goal.targetPercentage) * 100} className="h-2" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {isActive ? (
                            daysLeft === 0 ? 'Ends today' :
                            daysLeft === 1 ? '1 day left' :
                            `${daysLeft} days left`
                          ) : 'Expired'}
                        </span>
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
                  <Input
                    placeholder="e.g., Learn Spanish, Run a marathon..."
                    value={missionTitle}
                    onChange={(e) => setMissionTitle(e.target.value)}
                    maxLength={100}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea
                    placeholder="Describe your mission..."
                    value={missionDescription}
                    onChange={(e) => setMissionDescription(e.target.value)}
                    maxLength={500}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={missionCategory} onValueChange={setMissionCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MISSION_CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Target Date (optional)</Label>
                    <Input
                      type="date"
                      value={missionTargetDate}
                      onChange={(e) => setMissionTargetDate(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={createMission} className="flex-1">
                    Create Mission
                  </Button>
                  <Button onClick={() => setShowMissionForm(false)} variant="outline">
                    Cancel
                  </Button>
                </div>
              </Card>
            )}
            
            <div className="space-y-3">
              {missions.length === 0 && !showMissionForm && (
                <Card className="p-6 text-center">
                  <Rocket className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground mb-2">No missions yet</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Create a mission to track any goal with a progress bar you can update anytime
                  </p>
                  <Button onClick={() => setShowMissionForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Mission
                  </Button>
                </Card>
              )}
              
              {/* Active Missions */}
              {missions.filter(m => !m.isCompleted).length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground">Active Missions</h3>
                  {missions.filter(m => !m.isCompleted).map((mission) => {
                    const isEditing = editingMission === mission.id;
                    const daysUntilTarget = mission.targetDate 
                      ? Math.ceil((new Date(mission.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                      : null;
                    
                    return (
                      <Card key={mission.id} className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                                {mission.category}
                              </span>
                              {daysUntilTarget !== null && daysUntilTarget <= 7 && daysUntilTarget > 0 && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning flex items-center gap-1">
                                  <Bell className="h-3 w-3" />
                                  {daysUntilTarget}d left
                                </span>
                              )}
                            </div>
                            <h3 className="font-semibold mt-2">{mission.title}</h3>
                            {mission.description && (
                              <p className="text-xs text-muted-foreground mt-1">{mission.description}</p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            {!isEditing && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => {
                                  setEditingMission(mission.id);
                                  setEditProgress(mission.progressPercent);
                                }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => deleteMission(mission.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          {isEditing ? (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Progress</span>
                                <span className="font-bold">{editProgress}%</span>
                              </div>
                              <Slider
                                value={[editProgress]}
                                onValueChange={(v) => setEditProgress(v[0])}
                                max={100}
                                step={5}
                              />
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  className="flex-1"
                                  onClick={() => updateMissionProgress(mission.id, editProgress)}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Save
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => setEditingMission(null)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Progress</span>
                                <span className="font-bold">{mission.progressPercent}%</span>
                              </div>
                              <Progress value={mission.progressPercent} className="h-3" />
                              {mission.targetDate && (
                                <div className="text-xs text-muted-foreground">
                                  Target: {new Date(mission.targetDate).toLocaleDateString()}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
              
              {/* Completed Missions */}
              {missions.filter(m => m.isCompleted).length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground">Completed Missions 🎉</h3>
                  {missions.filter(m => m.isCompleted).map((mission) => (
                    <Card key={mission.id} className="p-4 border-success/50 bg-success/5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success capitalize">
                              {mission.category}
                            </span>
                            <span className="text-xs text-success font-semibold">✓ Completed</span>
                          </div>
                          <h3 className="font-semibold mt-2 line-through text-muted-foreground">{mission.title}</h3>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => deleteMission(mission.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
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
