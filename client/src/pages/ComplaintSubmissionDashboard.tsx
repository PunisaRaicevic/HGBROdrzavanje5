import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Send, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { PhotoUpload, PhotoPreview } from '@/components/PhotoUpload';

export default function ComplaintSubmissionDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [hotel, setHotel] = useState('');
  const [customHotel, setCustomHotel] = useState('');
  const [blok, setBlok] = useState('');
  const [customBlok, setCustomBlok] = useState('');
  const [soba, setSoba] = useState('');
  const [priority, setPriority] = useState('normal');
  const [description, setDescription] = useState('');
  const [uploadedPhotos, setUploadedPhotos] = useState<PhotoPreview[]>([]);
  const [complaintsLimit, setComplaintsLimit] = useState<string>('10');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch user's submitted complaints
  const { data: tasksResponse, isLoading } = useQuery<{ tasks: any[] }>({
    queryKey: ['/api/tasks/my', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID is required');
      console.log('[MY TASKS] Fetching tasks for user:', user.id);
      const response = await apiRequest('GET', `/api/tasks/my?userId=${user.id}`);
      const data = await response.json();
      console.log('[MY TASKS] Success, tasks count:', data.tasks?.length || 0);
      return data;
    },
    enabled: !!user?.id,
  });

  const myComplaints = tasksResponse?.tasks || [];
  
  // Filter complaints based on selected limit
  const displayedComplaints = complaintsLimit === 'all' 
    ? myComplaints 
    : myComplaints.slice(0, parseInt(complaintsLimit));

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      console.log('[CREATE TASK] Sending request with data:', taskData);
      const response = await apiRequest('POST', '/api/tasks', taskData);
      const result = await response.json();
      console.log('[CREATE TASK] Success:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', 'my', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
  });


  const handleSubmitComplaint = async () => {
    // Prevent double submission
    if (isSubmitting || createTaskMutation.isPending) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Use custom values if "Ostalo" is selected
      const finalHotel = hotel === 'Ostalo' ? customHotel : hotel;
      const finalBlok = blok === 'Ostalo' ? customBlok : blok;

      if (!hotel || !blok || !description) {
        toast({
          title: "Error",
          description: "Please fill in Hotel/Zgrada, Blok/Prostorija, and description",
          variant: "destructive",
        });
        return;
      }

      // Validate custom inputs if "Ostalo" is selected
      if (hotel === 'Ostalo' && !customHotel.trim()) {
        toast({
          title: "Error",
          description: "Please specify the hotel/building name",
          variant: "destructive",
        });
        return;
      }

      if (blok === 'Ostalo' && !customBlok.trim()) {
        toast({
          title: "Error",
          description: "Please specify the block/room",
          variant: "destructive",
        });
        return;
      }

      if (!user) {
        toast({
          title: "Error",
          description: "User not authenticated",
          variant: "destructive",
        });
        return;
      }

      // Generate title from location using final values
      const title = soba 
        ? `${finalHotel}, ${finalBlok}, Soba ${soba}`
        : `${finalHotel}, ${finalBlok}`;

      // Convert photo previews to data URLs for storage
      const photoDataUrls = uploadedPhotos.map(photo => photo.dataUrl);

      await createTaskMutation.mutateAsync({
        title,
        description,
        hotel,
        blok,
        soba: soba || null,
        priority,
        userId: user.id,
        userName: user.fullName,
        userDepartment: user.department,
        images: photoDataUrls.length > 0 ? photoDataUrls : undefined,
      });

      toast({
        title: t('complaintSubmitted'),
        description: t('complaintForwarded'),
      });

      // Reset form
      setHotel('');
      setCustomHotel('');
      setBlok('');
      setCustomBlok('');
      setSoba('');
      setDescription('');
      setPriority('normal');
      setUploadedPhotos([]);
    } catch (error: any) {
      console.error('Error submitting complaint:', error);
      
      // Extract detailed error message from response
      let errorMessage = t('submitFailed');
      if (error?.response?.data?.details) {
        errorMessage = error.response.data.details;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: t('error'),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge variant="secondary" className="text-xs">{t('statusNew')}</Badge>;
      case 'with_operator':
        return <Badge className="text-xs">{t('statusWithOperator')}</Badge>;
      case 'assigned_to_radnik':
      case 'with_sef':
      case 'with_external':
        return <Badge className="text-xs">{t('statusInProgress')}</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-xs">{t('statusCompleted')}</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="text-xs">{t('statusCancelled')}</Badge>;
      case 'returned_to_operator':
      case 'returned_to_sef':
        return <Badge variant="outline" className="text-xs">{t('statusReturned')}</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const getElapsedTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}${t('daysAgo')}`;
    }
    if (diffHours > 0) {
      return `${diffHours}${t('hoursAgo')}`;
    }
    return t('justNow');
  };

  const getAssignedTo = (complaint: any): string => {
    switch (complaint.status) {
      case 'completed':
        // Show who completed the task
        if (complaint.completed_by_name) {
          return `✓ ${complaint.completed_by_name}`;
        }
        // Fallback: try to determine from assignment fields for old tasks
        if (complaint.assigned_to_name) {
          return `✓ ${complaint.assigned_to_name}`;
        }
        if (complaint.sef_name) {
          return `✓ ${complaint.sef_name}`;
        }
        if (complaint.external_company_name) {
          return `✓ ${complaint.external_company_name}`;
        }
        if (complaint.operator_name) {
          return `✓ ${complaint.operator_name}`;
        }
        return `✓ ${t('done')}`;
      case 'cancelled':
        return t('statusCancelled');
      case 'new':
        return t('awaitingReview');
      case 'with_operator':
      case 'returned_to_operator':
        return complaint.operator_name ? `→ ${complaint.operator_name}` : t('withOperator');
      case 'with_sef':
      case 'returned_to_sef':
        return complaint.sef_name ? `→ ${complaint.sef_name}` : t('withSupervisor');
      case 'assigned_to_radnik':
        return complaint.assigned_to_name ? `→ ${complaint.assigned_to_name}` : t('withTechnician');
      case 'with_external':
        return complaint.external_company_name ? `→ ${complaint.external_company_name}` : t('withExternalCompany');
      default:
        return t('inProgress');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-medium">{t('reportIssue')}</h1>
          <p className="text-muted-foreground mt-1">
            {user?.fullName} - {user?.role}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submit New Complaint Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {t('submitNewIssue')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hotel" className="text-base">{t('hotelBuildingRequired')}</Label>
              <Select value={hotel} onValueChange={(value) => {
                setHotel(value);
                if (value !== 'Ostalo') setCustomHotel('');
              }}>
                <SelectTrigger data-testid="select-hotel" className="text-base">
                  <SelectValue placeholder={t('hotelPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hotel Slovenska plaža">Hotel Slovenska plaža</SelectItem>
                  <SelectItem value="Hotel Aleksandar">Hotel Aleksandar</SelectItem>
                  <SelectItem value="Hotel Mogren">Hotel Mogren</SelectItem>
                  <SelectItem value="Hotel Palas">Hotel Palas</SelectItem>
                  <SelectItem value="Hotel Castellastva">Hotel Castellastva</SelectItem>
                  <SelectItem value="Hotel Palas Lux">Hotel Palas Lux</SelectItem>
                  <SelectItem value="Ostalo">Ostalo</SelectItem>
                </SelectContent>
              </Select>
              {hotel === 'Ostalo' && (
                <Input
                  id="custom-hotel"
                  placeholder="Unesite naziv hotela / Enter hotel name"
                  value={customHotel}
                  onChange={(e) => setCustomHotel(e.target.value)}
                  data-testid="input-custom-hotel"
                  className="mt-2 text-base"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="blok" className="text-base">{t('blockRoomRequired')}</Label>
              <Select value={blok} onValueChange={(value) => {
                setBlok(value);
                if (value !== 'Ostalo') setCustomBlok('');
              }}>
                <SelectTrigger data-testid="select-blok" className="text-base">
                  <SelectValue placeholder={t('blockPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vila Mirta A-blok">Vila Mirta A-blok</SelectItem>
                  <SelectItem value="Vila Magnolija B-blok">Vila Magnolija B-blok</SelectItem>
                  <SelectItem value="Vila Palmi C-blok">Vila Palmi C-blok</SelectItem>
                  <SelectItem value="Vila Kana D-blok">Vila Kana D-blok</SelectItem>
                  <SelectItem value="Vila Kamelija E-blok">Vila Kamelija E-blok</SelectItem>
                  <SelectItem value="Vila Oleandra F-blok">Vila Oleandra F-blok</SelectItem>
                  <SelectItem value="Vila Limuna G-blok">Vila Limuna G-blok</SelectItem>
                  <SelectItem value="Vila Maslina H-blok">Vila Maslina H-blok</SelectItem>
                  <SelectItem value="Vila Ruzmarin I-blok">Vila Ruzmarin I-blok</SelectItem>
                  <SelectItem value="Vila Lavanda L-blok">Vila Lavanda L-blok</SelectItem>
                  <SelectItem value="Vila Cempresa M-blok">Vila Cempresa M-blok</SelectItem>
                  <SelectItem value="Vila Tilija N-blok">Vila Tilija N-blok</SelectItem>
                  <SelectItem value="Vila Pinea O-blok">Vila Pinea O-blok</SelectItem>
                  <SelectItem value="Ostalo">Ostalo</SelectItem>
                </SelectContent>
              </Select>
              {blok === 'Ostalo' && (
                <Input
                  id="custom-blok"
                  placeholder="Unesite blok/prostoriju / Enter block/room"
                  value={customBlok}
                  onChange={(e) => setCustomBlok(e.target.value)}
                  data-testid="input-custom-blok"
                  className="mt-2 text-base"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="soba" className="text-base">{t('roomOptional')}</Label>
              <Input
                id="soba"
                placeholder={t('roomPlaceholder')}
                value={soba}
                onChange={(e) => setSoba(e.target.value)}
                data-testid="input-soba"
                className="text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority" className="text-base">{t('priority')}</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger data-testid="select-priority" className="text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">{t('urgent')}</SelectItem>
                  <SelectItem value="normal">{t('normal')}</SelectItem>
                  <SelectItem value="low">{t('can_wait')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-base">{t('descriptionRequired')}</Label>
              <Textarea
                id="description"
                placeholder={t('describeComplaintPlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                data-testid="textarea-description"
                className="text-base"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-base">Fotografije (opcionalno)</Label>
              <PhotoUpload 
                photos={uploadedPhotos}
                onPhotosChange={setUploadedPhotos}
                label="Upload fotografije problema (max 5MB po slici)"
              />
            </div>

            <Button 
              className="w-full min-h-11"
              onClick={handleSubmitComplaint}
              disabled={isSubmitting || createTaskMutation.isPending}
              data-testid="button-submit-complaint"
            >
              <Send className="w-4 h-4 mr-2" />
              {(isSubmitting || createTaskMutation.isPending) ? t('submitting') : t('submitIssue')}
            </Button>
          </CardContent>
        </Card>

        {/* My Submitted Complaints */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>{t('mySubmittedIssues')}</CardTitle>
              {myComplaints.length > 0 && (
                <Select 
                  value={complaintsLimit} 
                  onValueChange={setComplaintsLimit}
                >
                  <SelectTrigger 
                    className="w-[140px]" 
                    data-testid="select-complaints-limit"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5" data-testid="option-limit-5">
                      {t('show')} 5
                    </SelectItem>
                    <SelectItem value="10" data-testid="option-limit-10">
                      {t('show')} 10
                    </SelectItem>
                    <SelectItem value="20" data-testid="option-limit-20">
                      {t('show')} 20
                    </SelectItem>
                    <SelectItem value="all" data-testid="option-limit-all">
                      {t('showAll')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">{t('loading')}</p>
            ) : myComplaints.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noComplaintsYet')}</p>
            ) : (
              <div className="space-y-3">
                {displayedComplaints.map((complaint: any) => (
                <Card 
                  key={complaint.id} 
                  className="p-4 hover-elevate"
                  data-testid={`card-complaint-${complaint.id}`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{complaint.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {getAssignedTo(complaint)}
                        </p>
                        {complaint.description && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {complaint.description}
                          </p>
                        )}
                      </div>
                      {getStatusBadge(complaint.status)}
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{getElapsedTime(new Date(complaint.created_at))}</span>
                      </div>
                      {complaint.status === 'completed' && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  </div>
                </Card>
              ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
